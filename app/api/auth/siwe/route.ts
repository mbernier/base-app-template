import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  generateSiweMessage,
  verifySiweSignature,
  generateNonce,
} from '@/lib/auth';
import { upsertUser } from '@/lib/db';
import { logApiRequest, getAccountIdByAddress } from '@/lib/audit';

// GET - Generate SIWE message
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const chainId = parseInt(searchParams.get('chainId') || '84532');

  if (!address) {
    const status = 400;
    await logApiRequest({
      endpoint: '/api/auth/siwe',
      method: 'GET',
      responseStatus: status,
      responseTimeMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: 'Address required' }, { status });
  }

  const nonce = generateNonce();
  const message = generateSiweMessage(address, chainId, nonce);

  // Store nonce in session for verification
  const session = await getSession();
  session.nonce = nonce;
  await session.save();

  const status = 200;
  const accountId = await getAccountIdByAddress(address);
  await logApiRequest({
    endpoint: '/api/auth/siwe',
    method: 'GET',
    accountId: accountId || undefined,
    responseStatus: status,
    responseTimeMs: Date.now() - startTime,
  });

  return NextResponse.json({
    message: message.prepareMessage(),
    nonce,
  });
}

// POST - Verify signature and create session
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      const status = 400;
      await logApiRequest({
        endpoint: '/api/auth/siwe',
        method: 'POST',
        responseStatus: status,
        responseTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Message and signature required' }, { status });
    }

    const result = await verifySiweSignature(message, signature);

    if (!result.success) {
      const status = 401;
      await logApiRequest({
        endpoint: '/api/auth/siwe',
        method: 'POST',
        responseStatus: status,
        responseTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({ error: result.error }, { status });
    }

    // Create/update user in database
    const user = await upsertUser({
      address: result.address!,
      chainId: result.chainId!,
    });

    // Create session
    const session = await getSession();
    session.address = result.address;
    session.chainId = result.chainId;
    session.isLoggedIn = true;
    await session.save();

    const status = 200;
    await logApiRequest({
      endpoint: '/api/auth/siwe',
      method: 'POST',
      accountId: user.id,
      responseStatus: status,
      responseTimeMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      user: {
        address: user.address,
        username: user.username,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('SIWE verification error:', error);
    const status = 500;
    await logApiRequest({
      endpoint: '/api/auth/siwe',
      method: 'POST',
      responseStatus: status,
      responseTimeMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status });
  }
}
