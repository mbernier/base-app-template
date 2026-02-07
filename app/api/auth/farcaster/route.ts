import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { upsertUser } from '@/lib/db';
import { upsertFarcasterUser } from '@/lib/farcaster';
import { initializeSuperAdmin } from '@/lib/admin';
import { logApiRequest, getAccountIdByAddress } from '@/lib/audit';
import { blockchain } from '@/lib/config';

// POST - Create session from Farcaster context
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { fid, address, username, displayName, pfpUrl } = await request.json();

    if (!fid || !address) {
      const status = 400;
      await logApiRequest({
        endpoint: '/api/auth/farcaster',
        method: 'POST',
        responseStatus: status,
        responseTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'fid and address are required' }, { status });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      const status = 400;
      await logApiRequest({
        endpoint: '/api/auth/farcaster',
        method: 'POST',
        responseStatus: status,
        responseTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Invalid address format' }, { status });
    }

    // Validate fid is a positive integer
    if (typeof fid !== 'number' || fid <= 0 || !Number.isInteger(fid)) {
      const status = 400;
      await logApiRequest({
        endpoint: '/api/auth/farcaster',
        method: 'POST',
        responseStatus: status,
        responseTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Invalid fid' }, { status });
    }

    // Upsert user in accounts table (reuses existing SIWE flow)
    const user = await upsertUser({
      address,
      chainId: blockchain.chainId,
    });

    // Initialize super admin if this is the configured address
    await initializeSuperAdmin(address);

    // Upsert Farcaster-specific data
    await upsertFarcasterUser(user.id, fid, username, displayName, pfpUrl);

    // Create session
    const session = await getSession();
    session.address = address.toLowerCase();
    session.chainId = blockchain.chainId;
    session.isLoggedIn = true;
    session.fid = fid;
    session.authMethod = 'farcaster';
    await session.save();

    const status = 200;
    await logApiRequest({
      endpoint: '/api/auth/farcaster',
      method: 'POST',
      accountId: user.id,
      responseStatus: status,
      responseTimeMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      user: {
        address: user.address,
        username: user.username || username,
        avatarUrl: user.avatar_url || pfpUrl,
        createdAt: user.created_at,
        fid,
        farcasterUsername: username,
      },
    });
  } catch (error) {
    console.error('Farcaster auth error:', error);
    const status = 500;
    const accountId = await getAccountIdByAddress('').catch(() => null);
    await logApiRequest({
      endpoint: '/api/auth/farcaster',
      method: 'POST',
      accountId: accountId || undefined,
      responseStatus: status,
      responseTimeMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status });
  }
}
