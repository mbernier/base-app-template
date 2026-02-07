import { NextRequest, NextResponse } from 'next/server';
import { getTokenMetadata } from '@/lib/nft';
import { apiMiddleware } from '@/lib/middleware';
import type { Address } from 'viem';
import type { NFTProvider } from '@/types/nft';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { rateLimit: true });
  if (middlewareResult) return middlewareResult;

  try {
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get('contractAddress');
    const tokenId = searchParams.get('tokenId') ?? undefined;
    const provider = searchParams.get('provider') as NFTProvider | null;

    if (!contractAddress) {
      return NextResponse.json({ error: 'contractAddress is required' }, { status: 400 });
    }

    const metadata = await getTokenMetadata(
      contractAddress as Address,
      tokenId,
      provider ?? undefined
    );

    return NextResponse.json({ metadata });
  } catch (error) {
    console.error('Get metadata error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
