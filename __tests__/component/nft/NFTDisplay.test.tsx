import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { NFTCollection, NFTToken, NFTMetadata } from '@/types/nft';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useNFTMetadata', () => ({
  useNFTMetadata: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

import { useNFTMetadata } from '@/hooks/useNFTMetadata';
import { NFTDisplay } from '@/components/nft/NFTDisplay';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCollection(overrides?: Partial<NFTCollection>): NFTCollection {
  return {
    id: 'col-1',
    name: 'Test Collection',
    provider: 'onchainkit',
    chainId: 8453,
    isActive: true,
    providerConfig: {},
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

function makeToken(overrides?: Partial<NFTToken>): NFTToken {
  return {
    id: 'tok-1',
    collectionId: 'col-1',
    totalMinted: 0,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

function mockMetadataHook(overrides?: {
  metadata?: NFTMetadata | null;
  isLoading?: boolean;
  error?: string | null;
}) {
  const defaults = {
    metadata: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
  (useNFTMetadata as ReturnType<typeof vi.fn>).mockReturnValue({
    ...defaults,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('useNFTMetadata mock contract validation', () => {
  it('mock returns expected shape', () => {
    // Validate that the vi.mock replaced the module with our mock function
    expect(typeof useNFTMetadata).toBe('function');
    expect(vi.isMockFunction(useNFTMetadata)).toBe(true);
  });

  it('mock returns the correct return type when configured', () => {
    (useNFTMetadata as ReturnType<typeof vi.fn>).mockReturnValue({
      metadata: { name: 'Test', description: 'desc', imageUrl: 'http://img' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const result = useNFTMetadata('0xabc', '1', 'onchainkit');
    expect(result).toHaveProperty('metadata');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('refetch');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('NFTDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when isLoading is true', () => {
    mockMetadataHook({ isLoading: true });

    render(<NFTDisplay collection={makeCollection()} />);

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('shows image when imageUrl is available', () => {
    mockMetadataHook({
      metadata: {
        name: 'Meta Name',
        imageUrl: 'https://example.com/image.png',
      },
    });

    render(<NFTDisplay collection={makeCollection()} />);

    const img = screen.getByRole('img', { name: 'Meta Name' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.png');
  });

  it('shows "NFT" placeholder when no imageUrl is available', () => {
    mockMetadataHook({ metadata: { name: 'No Image' } });

    render(<NFTDisplay collection={makeCollection()} />);

    expect(screen.getByText('NFT')).toBeInTheDocument();
  });

  it('uses token name over metadata name over collection name (priority)', () => {
    mockMetadataHook({
      metadata: { name: 'Metadata Name', imageUrl: 'https://example.com/img.png' },
    });

    const collection = makeCollection({ name: 'Collection Name' });
    const token = makeToken({ name: 'Token Name' });

    render(<NFTDisplay collection={collection} token={token} />);

    // Token name takes priority
    expect(screen.getByText('Token Name')).toBeInTheDocument();
    expect(screen.queryByText('Metadata Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Collection Name')).not.toBeInTheDocument();
  });

  it('falls back to metadata name when token has no name', () => {
    mockMetadataHook({
      metadata: { name: 'Metadata Name' },
    });

    const collection = makeCollection({ name: 'Collection Name' });
    const token = makeToken(); // no name

    render(<NFTDisplay collection={collection} token={token} />);

    expect(screen.getByText('Metadata Name')).toBeInTheDocument();
  });

  it('shows provider badge with formatted text', () => {
    mockMetadataHook({});

    const collection = makeCollection({ provider: 'zora_protocol' });

    render(<NFTDisplay collection={collection} />);

    expect(screen.getByText('zora protocol')).toBeInTheDocument();
  });

  it('shows token standard badge when present', () => {
    mockMetadataHook({});

    const collection = makeCollection({ tokenStandard: 'erc721' });

    render(<NFTDisplay collection={collection} />);

    expect(screen.getByText('ERC721')).toBeInTheDocument();
  });

  it('does not show token standard badge when absent', () => {
    mockMetadataHook({});

    const collection = makeCollection(); // no tokenStandard

    render(<NFTDisplay collection={collection} />);

    // Only the provider badge should be present, not a token standard badge
    expect(screen.queryByText('ERC721')).not.toBeInTheDocument();
    expect(screen.queryByText('ERC1155')).not.toBeInTheDocument();
    expect(screen.queryByText('ERC20')).not.toBeInTheDocument();
  });
});
