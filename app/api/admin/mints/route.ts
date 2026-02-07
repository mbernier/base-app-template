import { NextRequest, NextResponse } from 'next/server';
import { getMintStats } from '@/lib/nft-db';
import { apiMiddleware } from '@/lib/middleware';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAdmin: true });
  if (middlewareResult) return middlewareResult;

  try {
    const stats = await getMintStats();

    const recentMints = stats.recentMints.map((m) => ({
      id: m.id,
      collectionId: m.collection_id,
      tokenId: m.token_id,
      accountId: m.account_id,
      minterAddress: m.minter_address,
      quantity: m.quantity,
      txHash: m.tx_hash,
      provider: m.provider,
      providerMetadata: m.provider_metadata,
      status: m.status,
      createdAt: m.created_at,
    }));

    return NextResponse.json({
      stats: {
        totalMints: stats.totalMints,
        totalQuantity: stats.totalQuantity,
        uniqueMinters: stats.uniqueMinters,
      },
      recentMints,
    });
  } catch (error) {
    console.error('Get mint stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
