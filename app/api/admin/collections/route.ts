import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserByAddress } from '@/lib/db';
import { getCollections, createCollection } from '@/lib/nft-db';
import { apiMiddleware } from '@/lib/middleware';
import type { NFTProvider, TokenStandard } from '@/types/nft';

const VALID_PROVIDERS: NFTProvider[] = ['onchainkit', 'zora_protocol', 'zora_coins'];
const VALID_STANDARDS: TokenStandard[] = ['erc721', 'erc1155', 'erc20'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAdmin: true });
  if (middlewareResult) return middlewareResult;

  try {
    const collections = await getCollections();

    const formatted = collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      provider: c.provider,
      contractAddress: c.contract_address,
      chainId: c.chain_id,
      tokenStandard: c.token_standard,
      isActive: c.is_active,
      providerConfig: c.provider_config,
      imageUrl: c.image_url,
      externalUrl: c.external_url,
      createdBy: c.created_by,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    return NextResponse.json({ collections: formatted });
  } catch (error) {
    console.error('Get collections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAdmin: true });
  if (middlewareResult) return middlewareResult;

  try {
    const session = await getSession();
    if (!session.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserByAddress(session.address);
    const body = await request.json();

    const { name, description, provider, contractAddress, chainId, tokenStandard, providerConfig, imageUrl, externalUrl } = body;

    if (!name || !provider) {
      return NextResponse.json({ error: 'Name and provider are required' }, { status: 400 });
    }

    if (!VALID_PROVIDERS.includes(provider as NFTProvider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    if (tokenStandard && !VALID_STANDARDS.includes(tokenStandard as TokenStandard)) {
      return NextResponse.json({ error: 'Invalid token standard' }, { status: 400 });
    }

    const collection = await createCollection({
      name,
      description: description ?? null,
      provider,
      contract_address: contractAddress ?? null,
      chain_id: chainId ?? 8453,
      token_standard: tokenStandard ?? null,
      provider_config: providerConfig ?? {},
      image_url: imageUrl ?? null,
      external_url: externalUrl ?? null,
      created_by: user?.id ?? null,
    });

    return NextResponse.json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        provider: collection.provider,
        contractAddress: collection.contract_address,
        chainId: collection.chain_id,
        tokenStandard: collection.token_standard,
        isActive: collection.is_active,
        providerConfig: collection.provider_config,
        imageUrl: collection.image_url,
        externalUrl: collection.external_url,
        createdBy: collection.created_by,
        createdAt: collection.created_at,
        updatedAt: collection.updated_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create collection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
