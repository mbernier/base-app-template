import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';
import { isAdmin as checkIsAdmin } from './admin';
import { hasPermission } from './admin-permissions';
import { rateLimit } from './rate-limit';
import type { AdminPermission } from '@/types/admin';

// Auth middleware
export async function requireAuth(_request: NextRequest): Promise<NextResponse | null> {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  return null; // Continue
}

// Rate limit middleware
export async function requireRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const path = new URL(request.url).pathname;
  const identifier = `${ip}:${path}`;

  const result = await rateLimit(identifier);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetMs - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
          'Retry-After': String(Math.max(1, retryAfter)),
        },
      }
    );
  }

  return null; // Continue
}

// Admin middleware
export async function requireAdmin(_request: NextRequest): Promise<NextResponse | null> {
  const session = await getSession();

  if (!session.isLoggedIn || !session.address) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const admin = await checkIsAdmin(session.address);
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return null; // Continue
}

// Permission middleware
export async function requirePermissionMiddleware(
  _request: NextRequest,
  permission: AdminPermission
): Promise<NextResponse | null> {
  const session = await getSession();

  if (!session.isLoggedIn || !session.address) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const allowed = await hasPermission(session.address, permission);
  if (!allowed) {
    return NextResponse.json({ error: `Permission required: ${permission}` }, { status: 403 });
  }

  return null; // Continue
}

// Combine middleware
export async function apiMiddleware(
  request: NextRequest,
  options: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    requirePermission?: AdminPermission;
    rateLimit?: boolean;
  } = {}
): Promise<NextResponse | null> {
  if (options.rateLimit !== false) {
    const rateLimitResult = await requireRateLimit(request);
    if (rateLimitResult) return rateLimitResult;
  }

  if (options.requireAuth || options.requireAdmin || options.requirePermission) {
    const authResult = await requireAuth(request);
    if (authResult) return authResult;
  }

  if (options.requireAdmin || options.requirePermission) {
    const adminResult = await requireAdmin(request);
    if (adminResult) return adminResult;
  }

  if (options.requirePermission) {
    const permResult = await requirePermissionMiddleware(request, options.requirePermission);
    if (permResult) return permResult;
  }

  return null; // Continue
}
