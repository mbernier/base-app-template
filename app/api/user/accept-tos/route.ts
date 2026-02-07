import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateTosAcceptance } from '@/lib/db';
import { apiMiddleware } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const middlewareResult = await apiMiddleware(request, { requireAuth: true });
  if (middlewareResult) return middlewareResult;

  try {
    const session = await getSession();
    if (!session.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { version } = body;

    if (!version || typeof version !== 'string') {
      return NextResponse.json({ error: 'Version is required' }, { status: 400 });
    }

    // Update database
    const user = await updateTosAcceptance(session.address, version);

    // Update session
    session.tosAcceptedVersion = version;
    session.tosAcceptedAt = user.tos_accepted_at || new Date().toISOString();
    await session.save();

    return NextResponse.json({
      success: true,
      version,
      acceptedAt: user.tos_accepted_at,
    });
  } catch (error) {
    console.error('Accept ToS error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
