import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NFTCollection } from '@/types/nft';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useNFTCollection', () => ({
  useNFTCollections: vi.fn(),
}));

vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div role="status" aria-label="Loading" data-testid={`spinner-${size || 'md'}`}>
      Loading...
    </div>
  ),
}));

vi.mock('./NFTCollectionCard', () => ({
  NFTCollectionCard: ({
    collection,
    onClick,
  }: {
    collection: NFTCollection;
    onClick?: () => void;
  }) => (
    <div data-testid={`collection-card-${collection.id}`} onClick={onClick}>
      {collection.name}
    </div>
  ),
}));

import { useNFTCollections } from '@/hooks/useNFTCollection';
import { NFTGrid } from '@/components/nft/NFTGrid';

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

interface MockCollectionsState {
  collections?: NFTCollection[];
  isLoading?: boolean;
  error?: string | null;
}

function mockCollectionsHook(overrides?: MockCollectionsState) {
  const defaults = {
    collections: [] as NFTCollection[],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
  (useNFTCollections as ReturnType<typeof vi.fn>).mockReturnValue({
    ...defaults,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('useNFTCollections mock contract validation', () => {
  it('mock returns expected shape', () => {
    expect(typeof useNFTCollections).toBe('function');
    expect(vi.isMockFunction(useNFTCollections)).toBe(true);
  });

  it('mock returns the correct return type when configured', () => {
    (useNFTCollections as ReturnType<typeof vi.fn>).mockReturnValue({
      collections: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const result = useNFTCollections();
    expect(result).toHaveProperty('collections');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('refetch');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('NFTGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when isLoading is true', () => {
    mockCollectionsHook({ isLoading: true });

    render(<NFTGrid />);

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('shows error message when error occurs', () => {
    mockCollectionsHook({ error: 'Network error' });

    render(<NFTGrid />);

    expect(screen.getByText('Failed to load collections: Network error')).toBeInTheDocument();
  });

  it('shows empty state when no collections exist', () => {
    mockCollectionsHook({ collections: [] });

    render(<NFTGrid />);

    expect(screen.getByText('No NFT collections available.')).toBeInTheDocument();
  });

  it('renders collection cards for each collection', () => {
    const collections = [
      makeCollection({ id: 'col-1', name: 'Alpha' }),
      makeCollection({ id: 'col-2', name: 'Beta' }),
      makeCollection({ id: 'col-3', name: 'Gamma' }),
    ];
    mockCollectionsHook({ collections });

    render(<NFTGrid />);

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('calls onCollectionClick with collection id when card is clicked', async () => {
    const collections = [makeCollection({ id: 'col-42', name: 'Clickable' })];
    mockCollectionsHook({ collections });
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<NFTGrid onCollectionClick={handleClick} />);

    await user.click(screen.getByText('Clickable'));

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith('col-42');
  });
});
