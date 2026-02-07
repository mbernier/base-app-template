import { NextRequest, NextResponse } from 'next/server';
import { getCollections } from '@/lib/nft-db';
import { apiMiddleware } from '@/lib/middleware';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { rateLimit: true });
  if (middlewareResult) return middlewareResult;

  try {
    const collections = await getCollections({ activeOnly: true });

    const formatted = collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      provider: c.provider,
      contractAddress: c.contract_address,
      chainId: c.chain_id,
      tokenStandard: c.token_standard,
      imageUrl: c.image_url,
      externalUrl: c.external_url,
      createdAt: c.created_at,
    }));

    return NextResponse.json({ collections: formatted });
  } catch (error) {
    console.error('Get public collections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
