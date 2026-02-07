import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserByAddress } from '@/lib/db';
import { logApiRequest } from '@/lib/audit';

export async function GET() {
  const startTime = Date.now();

  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.address) {
      await logApiRequest({
        endpoint: '/api/auth/session',
        method: 'GET',
        responseStatus: 200,
        responseTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({ isLoggedIn: false });
    }

    // Optionally fetch user data
    let user = null;
    let accountId: string | null = null;
    try {
      const dbUser = await getUserByAddress(session.address);
      if (dbUser) {
        accountId = dbUser.id;
        user = {
          address: dbUser.address,
          username: dbUser.username,
          avatarUrl: dbUser.avatar_url,
          createdAt: dbUser.created_at,
        };
      }
    } catch {
      // User might not exist in DB yet
    }

    await logApiRequest({
      endpoint: '/api/auth/session',
      method: 'GET',
      accountId: accountId || undefined,
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });

    return NextResponse.json({
      isLoggedIn: true,
      address: session.address,
      chainId: session.chainId,
      tosAcceptedVersion: session.tosAcceptedVersion,
      fid: session.fid,
      authMethod: session.authMethod,
      user,
    });
  } catch (error) {
    console.error('Session check error:', error);
    await logApiRequest({
      endpoint: '/api/auth/session',
      method: 'GET',
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });
    return NextResponse.json({ isLoggedIn: false });
  }
}
