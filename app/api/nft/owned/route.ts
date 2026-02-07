import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserByAddress } from '@/lib/db';
import { getMintsByAccount } from '@/lib/nft-db';
import { apiMiddleware } from '@/lib/middleware';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAuth: true });
  if (middlewareResult) return middlewareResult;

  try {
    const session = await getSession();
    if (!session.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserByAddress(session.address);
    if (!user) {
      return NextResponse.json({ mints: [] });
    }

    const mints = await getMintsByAccount(user.id);

    const formatted = mints.map((m) => ({
      id: m.id,
      collectionId: m.collection_id,
      tokenId: m.token_id,
      minterAddress: m.minter_address,
      quantity: m.quantity,
      txHash: m.tx_hash,
      provider: m.provider,
      providerMetadata: m.provider_metadata,
      status: m.status,
      createdAt: m.created_at,
    }));

    return NextResponse.json({ mints: formatted });
  } catch (error) {
    console.error('Get owned NFTs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
