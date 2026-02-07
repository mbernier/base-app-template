import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createUntypedServerClient } from '@/lib/db';
import { requireRateLimit } from '@/lib/middleware';
import { getSession } from '@/lib/auth';

// Zod schemas for input validation
const pageVisitSchema = z.object({
  type: z.literal('page_visit'),
  data: z.object({
    anonymousId: z.string().min(1).max(128),
    sessionId: z.string().min(1).max(128),
    path: z.string().min(1).max(2048),
    referrer: z.string().max(2048).nullable().optional(),
    queryParams: z.record(z.string().max(512)).nullable().optional(),
    userAgent: z.string().max(512).nullable().optional(),
    screenWidth: z.number().int().min(0).max(10000).nullable().optional(),
    screenHeight: z.number().int().min(0).max(10000).nullable().optional(),
  }),
});

const analyticsEventSchema = z.object({
  type: z.literal('event'),
  data: z.object({
    anonymousId: z.string().min(1).max(128),
    eventType: z.string().min(1).max(128),
    properties: z.record(z.unknown()).nullable().optional(),
  }),
});

const trackRequestSchema = z.discriminatedUnion('type', [
  pageVisitSchema,
  analyticsEventSchema,
]);

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = requireRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();

    // Validate input with zod
    const parsed = trackRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type, data } = parsed.data;
    const supabase = createUntypedServerClient();

    // Get current user if logged in
    let accountId: string | null = null;
    try {
      const session = await getSession();
      if (session.isLoggedIn && session.address) {
        const { data: account } = await supabase
          .from('accounts')
          .select('id')
          .eq('address', session.address.toLowerCase())
          .single();
        if (account) {
          accountId = (account as { id: string }).id;
        }
      }
    } catch {
      // Continue without account ID
    }

    if (type === 'page_visit') {
      // Sanitize user agent (truncate to prevent storage abuse)
      const sanitizedUserAgent = data.userAgent?.substring(0, 512) ?? null;

      await supabase.from('page_visits').insert({
        anonymous_id: data.anonymousId,
        account_id: accountId,
        path: data.path,
        referrer: data.referrer ?? null,
        query_params: data.queryParams ?? null,
        user_agent: sanitizedUserAgent,
        screen_width: data.screenWidth ?? null,
        screen_height: data.screenHeight ?? null,
        session_id: data.sessionId,
      });
    } else {
      await supabase.from('analytics_events').insert({
        event_type: data.eventType,
        anonymous_id: data.anonymousId,
        account_id: accountId,
        properties: data.properties ?? null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log but don't fail - analytics shouldn't break the app
    console.error('Analytics track error:', error);
    return NextResponse.json({ success: true });
  }
}
