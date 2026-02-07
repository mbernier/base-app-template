import { NextRequest, NextResponse } from 'next/server';
import { getCollectionById, getTokensByCollection } from '@/lib/nft-db';
import { apiMiddleware } from '@/lib/middleware';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { rateLimit: true });
  if (middlewareResult) return middlewareResult;

  try {
    const { id } = await context.params;
    const collection = await getCollectionById(id);

    if (!collection || !collection.is_active) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const tokens = await getTokensByCollection(id, { activeOnly: true });

    return NextResponse.json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        provider: collection.provider,
        contractAddress: collection.contract_address,
        chainId: collection.chain_id,
        tokenStandard: collection.token_standard,
        imageUrl: collection.image_url,
        externalUrl: collection.external_url,
        createdAt: collection.created_at,
      },
      tokens: tokens.map((t) => ({
        id: t.id,
        collectionId: t.collection_id,
        tokenId: t.token_id,
        name: t.name,
        description: t.description,
        imageUrl: t.image_url,
        maxSupply: t.max_supply,
        totalMinted: t.total_minted,
        createdAt: t.created_at,
      })),
    });
  } catch (error) {
    console.error('Get public collection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
