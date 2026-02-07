import { NextRequest, NextResponse } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';
import { requireRateLimit } from '@/lib/middleware';
import { getSession } from '@/lib/auth';
import type { TrackRequest, PageVisitData, AnalyticsEventData } from '@/types/api';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = requireRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = (await request.json()) as TrackRequest;
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Type and data required' }, { status: 400 });
    }

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
      const pageData = data as PageVisitData;
      await supabase.from('page_visits').insert({
        anonymous_id: pageData.anonymousId,
        account_id: accountId,
        path: pageData.path,
        referrer: pageData.referrer ?? null,
        query_params: pageData.queryParams ?? null,
        user_agent: pageData.userAgent ?? null,
        screen_width: pageData.screenWidth ?? null,
        screen_height: pageData.screenHeight ?? null,
        session_id: pageData.sessionId,
      });
    } else if (type === 'event') {
      const eventData = data as AnalyticsEventData;
      await supabase.from('analytics_events').insert({
        event_type: eventData.eventType,
        anonymous_id: eventData.anonymousId,
        account_id: accountId,
        properties: eventData.properties ?? null,
      });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log but don't fail - analytics shouldn't break the app
    console.error('Analytics track error:', error);
    return NextResponse.json({ success: true });
  }
}
