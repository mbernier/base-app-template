import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserByAddress } from '@/lib/db';
import { recordMint, updateMintStatus, getCollectionById } from '@/lib/nft-db';
import { apiMiddleware } from '@/lib/middleware';
import type { MintStatus } from '@/types/nft';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAuth: true });
  if (middlewareResult) return middlewareResult;

  try {
    const session = await getSession();
    if (!session.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { collectionId, tokenId, quantity, txHash, status, mintId } = body;

    // If mintId is provided, update existing mint status
    if (mintId) {
      const validStatuses: MintStatus[] = ['pending', 'confirmed', 'failed'];
      if (!status || !validStatuses.includes(status as MintStatus)) {
        return NextResponse.json({ error: 'Valid status required for update' }, { status: 400 });
      }

      const updated = await updateMintStatus(mintId, status as MintStatus, txHash);

      return NextResponse.json({
        mint: {
          id: updated.id,
          collectionId: updated.collection_id,
          tokenId: updated.token_id,
          minterAddress: updated.minter_address,
          quantity: updated.quantity,
          txHash: updated.tx_hash,
          provider: updated.provider,
          status: updated.status,
          createdAt: updated.created_at,
        },
      });
    }

    // Create new mint record
    if (!collectionId) {
      return NextResponse.json({ error: 'collectionId is required' }, { status: 400 });
    }

    const collection = await getCollectionById(collectionId);
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const user = await getUserByAddress(session.address);

    const mint = await recordMint({
      collection_id: collectionId,
      token_id: tokenId ?? null,
      account_id: user?.id ?? null,
      minter_address: session.address.toLowerCase(),
      quantity: quantity ?? 1,
      tx_hash: txHash ?? null,
      provider: collection.provider,
      status: status ?? 'pending',
    });

    return NextResponse.json({
      mint: {
        id: mint.id,
        collectionId: mint.collection_id,
        tokenId: mint.token_id,
        minterAddress: mint.minter_address,
        quantity: mint.quantity,
        txHash: mint.tx_hash,
        provider: mint.provider,
        status: mint.status,
        createdAt: mint.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Record mint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
