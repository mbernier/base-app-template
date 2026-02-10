import { NextRequest, NextResponse } from 'next/server';
import { getSession, generateNonce, verifyFarcasterSignIn } from '@/lib/auth';
import { upsertUser } from '@/lib/db';
import { upsertFarcasterUser } from '@/lib/farcaster';
import { initializeSuperAdmin } from '@/lib/admin';
import { logApiRequest, getAccountIdByAddress } from '@/lib/audit';
import { blockchain } from '@/lib/config';

// GET - Generate nonce for SIWF (Sign In With Farcaster)
export async function GET() {
  const startTime = Date.now();

  const nonce = generateNonce();

  // Store nonce in session for verification
  const session = await getSession();
  session.nonce = nonce;
  await session.save();

  const status = 200;
  await logApiRequest({
    endpoint: '/api/auth/farcaster',
    method: 'GET',
    responseStatus: status,
    responseTimeMs: Date.now() - startTime,
  });

  return NextResponse.json({ nonce });
}

// POST - Verify SIWF signature and create session
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { message, signature, username, displayName, pfpUrl } = await request.json();

    if (!message || !signature) {
      const status = 400;
      await logApiRequest({
        endpoint: '/api/auth/farcaster',
        method: 'POST',
        responseStatus: status,
        responseTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Message and signature are required' }, { status });
    }

    // Retrieve session nonce for verification
    const session = await getSession();
    if (!session.nonce) {
      const status = 401;
      await logApiRequest({
        endpoint: '/api/auth/farcaster',
        method: 'POST',
        responseStatus: status,
        responseTimeMs: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: 'No nonce found in session. Request a nonce first.' },
        { status }
      );
    }

    // Verify SIWF message+signature cryptographically
    const result = await verifyFarcasterSignIn(message, signature, session.nonce);

    // Clear nonce after verification attempt (prevent replay)
    session.nonce = undefined;
    await session.save();

    if (!result.success || !result.fid || !result.address) {
      const status = 401;
      await logApiRequest({
        endpoint: '/api/auth/farcaster',
        method: 'POST',
        responseStatus: status,
        responseTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Authentication failed' }, { status });
    }

    // Use ONLY cryptographically verified fid and address -- never from client body
    const verifiedFid = result.fid;
    const verifiedAddress = result.address;

    // Upsert user in accounts table (reuses existing SIWE flow)
    const user = await upsertUser({
      address: verifiedAddress,
      chainId: blockchain.chainId,
    });

    // Initialize super admin if this is the configured address
    await initializeSuperAdmin(verifiedAddress);

    // Upsert Farcaster-specific data (profile data from client is cosmetic only)
    await upsertFarcasterUser(user.id, verifiedFid, username, displayName, pfpUrl);

    // Create session with verified auth data
    session.address = verifiedAddress.toLowerCase();
    session.chainId = blockchain.chainId;
    session.isLoggedIn = true;
    session.fid = verifiedFid;
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
        fid: verifiedFid,
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
