import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buildMintTransaction } from '@/lib/nft';
import { apiMiddleware } from '@/lib/middleware';
import type { Address } from 'viem';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAuth: true });
  if (middlewareResult) return middlewareResult;

  try {
    const session = await getSession();
    if (!session.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { collectionId, tokenId, quantity } = body;

    if (!collectionId) {
      return NextResponse.json({ error: 'collectionId is required' }, { status: 400 });
    }

    const txData = await buildMintTransaction({
      collectionId,
      tokenId,
      minterAddress: session.address as Address,
      quantity: quantity ?? 1,
    });

    // Serialize BigInt values for JSON transport
    const serializedCalls = txData.calls.map((call) => ({
      address: call.address,
      abi: call.abi,
      functionName: call.functionName,
      args: call.args,
      value: call.value ? call.value.toString() : undefined,
    }));

    return NextResponse.json({
      calls: serializedCalls,
      value: txData.value ? txData.value.toString() : undefined,
    });
  } catch (error) {
    console.error('Prepare mint error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
