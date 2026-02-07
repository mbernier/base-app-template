import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';
import { rateLimit as rateLimitConfig } from './config';

// Rate limiting (in-memory - for production with multiple instances, use Redis or similar)
// NOTE: This map is per-process. In a multi-server deployment, requests can
// exceed limits proportional to the number of instances. See docs for Redis setup.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  windowMs: number = rateLimitConfig.windowMs,
  maxRequests: number = rateLimitConfig.maxRequests
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Auth middleware
export async function requireAuth(_request: NextRequest): Promise<NextResponse | null> {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  return null; // Continue
}

// Rate limit middleware
export function requireRateLimit(request: NextRequest): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const path = new URL(request.url).pathname;
  const identifier = `${ip}:${path}`;

  if (!rateLimit(identifier)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  return null; // Continue
}

// Combine middleware
export async function apiMiddleware(
  request: NextRequest,
  options: { requireAuth?: boolean; rateLimit?: boolean } = {}
): Promise<NextResponse | null> {
  if (options.rateLimit !== false) {
    const rateLimitResult = requireRateLimit(request);
    if (rateLimitResult) return rateLimitResult;
  }

  if (options.requireAuth) {
    const authResult = await requireAuth(request);
    if (authResult) return authResult;
  }

  return null; // Continue
}
