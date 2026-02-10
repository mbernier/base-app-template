import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NFTCollection } from '@/types/nft';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

import { NFTCollectionCard } from '@/components/nft/NFTCollectionCard';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
import NextImage from 'next/image';

describe('next/image mock contract validation', () => {
  it('mock replaces next/image default export with a simple img renderer', () => {
    // Validate that vi.mock replaced the module
    expect(typeof NextImage).toBe('function');
  });

  it('mock renders an img element with passed props', () => {
    const { container } = render(<NextImage src="/test.png" alt="test" width={100} height={100} />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('alt')).toBe('test');
  });
});

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

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('NFTCollectionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders collection name', () => {
    render(<NFTCollectionCard collection={makeCollection({ name: 'Cool NFTs' })} />);

    expect(screen.getByText('Cool NFTs')).toBeInTheDocument();
  });

  it('renders collection description when provided', () => {
    render(
      <NFTCollectionCard
        collection={makeCollection({ description: 'A great collection of NFTs' })}
      />
    );

    expect(screen.getByText('A great collection of NFTs')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<NFTCollectionCard collection={makeCollection()} />);

    // Only the name and provider badge should be visible, no description paragraph
    expect(screen.queryByText('A great collection of NFTs')).not.toBeInTheDocument();
  });

  it('renders image when imageUrl is provided', () => {
    render(
      <NFTCollectionCard
        collection={makeCollection({
          name: 'Image Collection',
          imageUrl: 'https://example.com/nft.png',
        })}
      />
    );

    const img = screen.getByRole('img', { name: 'Image Collection' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/nft.png');
  });

  it('renders NFT placeholder when no imageUrl', () => {
    render(<NFTCollectionCard collection={makeCollection()} />);

    expect(screen.getByText('NFT')).toBeInTheDocument();
  });

  it('renders provider badge with formatted text', () => {
    render(<NFTCollectionCard collection={makeCollection({ provider: 'zora_protocol' })} />);

    expect(screen.getByText('zora protocol')).toBeInTheDocument();
  });

  it('renders token standard badge when provided', () => {
    render(<NFTCollectionCard collection={makeCollection({ tokenStandard: 'erc721' })} />);

    expect(screen.getByText('ERC721')).toBeInTheDocument();
  });

  it('does not render token standard badge when absent', () => {
    render(<NFTCollectionCard collection={makeCollection()} />);

    expect(screen.queryByText('ERC721')).not.toBeInTheDocument();
    expect(screen.queryByText('ERC1155')).not.toBeInTheDocument();
  });

  it('has button role and is clickable when onClick is provided', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <NFTCollectionCard collection={makeCollection({ name: 'Clickable' })} onClick={handleClick} />
    );

    const card = screen.getByRole('button');
    expect(card).toBeInTheDocument();

    await user.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles Enter key press when onClick is provided', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <NFTCollectionCard collection={makeCollection({ name: 'Keyboard' })} onClick={handleClick} />
    );

    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not have button role when onClick is not provided', () => {
    render(<NFTCollectionCard collection={makeCollection()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
