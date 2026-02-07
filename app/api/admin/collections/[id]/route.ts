import { NextRequest, NextResponse } from 'next/server';
import { getCollectionById, updateCollection, deleteCollection, getTokensByCollection } from '@/lib/nft-db';
import { apiMiddleware } from '@/lib/middleware';
import type { NFTProvider, TokenStandard } from '@/types/nft';

const VALID_PROVIDERS: NFTProvider[] = ['onchainkit', 'zora_protocol', 'zora_coins'];
const VALID_STANDARDS: TokenStandard[] = ['erc721', 'erc1155', 'erc20'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAdmin: true });
  if (middlewareResult) return middlewareResult;

  try {
    const { id } = await context.params;
    const collection = await getCollectionById(id);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const tokens = await getTokensByCollection(id);

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
      tokens: tokens.map((t) => ({
        id: t.id,
        collectionId: t.collection_id,
        tokenId: t.token_id,
        name: t.name,
        description: t.description,
        imageUrl: t.image_url,
        metadataUri: t.metadata_uri,
        metadata: t.metadata,
        maxSupply: t.max_supply,
        totalMinted: t.total_minted,
        isActive: t.is_active,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
    });
  } catch (error) {
    console.error('Get collection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAdmin: true });
  if (middlewareResult) return middlewareResult;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const { name, description, provider, contractAddress, chainId, tokenStandard, isActive, providerConfig, imageUrl, externalUrl } = body;

    if (provider && !VALID_PROVIDERS.includes(provider as NFTProvider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    if (tokenStandard && !VALID_STANDARDS.includes(tokenStandard as TokenStandard)) {
      return NextResponse.json({ error: 'Invalid token standard' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (provider !== undefined) update.provider = provider;
    if (contractAddress !== undefined) update.contract_address = contractAddress;
    if (chainId !== undefined) update.chain_id = chainId;
    if (tokenStandard !== undefined) update.token_standard = tokenStandard;
    if (isActive !== undefined) update.is_active = isActive;
    if (providerConfig !== undefined) update.provider_config = providerConfig;
    if (imageUrl !== undefined) update.image_url = imageUrl;
    if (externalUrl !== undefined) update.external_url = externalUrl;

    const collection = await updateCollection(id, update);

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
    });
  } catch (error) {
    console.error('Update collection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAdmin: true });
  if (middlewareResult) return middlewareResult;

  try {
    const { id } = await context.params;

    const collection = await getCollectionById(id);
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    await deleteCollection(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete collection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
