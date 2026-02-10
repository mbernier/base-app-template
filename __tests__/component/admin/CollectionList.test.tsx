import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { NFTCollection } from '@/types/nft';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { CollectionList } from '@/components/admin/CollectionList';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCollection(overrides: Partial<NFTCollection> = {}): NFTCollection {
  return {
    id: 'col-1',
    name: 'Test Collection',
    description: 'A test collection',
    provider: 'onchainkit',
    contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
    chainId: 8453,
    tokenStandard: 'erc721',
    isActive: true,
    providerConfig: {},
    imageUrl: 'https://example.com/image.png',
    externalUrl: 'https://example.com',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('CollectionList mock contract validation', () => {
  it('next/link mock renders anchor elements with href', () => {
    const collections = [makeCollection()];
    render(<CollectionList collections={collections} />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('CollectionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state with link to create collection', () => {
    render(<CollectionList collections={[]} />);

    expect(screen.getByText('No collections yet.')).toBeInTheDocument();
    const createLink = screen.getByText('Create your first collection');
    expect(createLink).toBeInTheDocument();
    expect(createLink.closest('a')).toHaveAttribute('href', '/admin/collections/new');
  });

  it('renders a table with collection rows', () => {
    const collections = [
      makeCollection({ id: 'col-1', name: 'Alpha Collection' }),
      makeCollection({
        id: 'col-2',
        name: 'Beta Collection',
        provider: 'zora_protocol',
        isActive: false,
      }),
    ];

    render(<CollectionList collections={collections} />);

    // Table headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Collection names
    expect(screen.getByText('Alpha Collection')).toBeInTheDocument();
    expect(screen.getByText('Beta Collection')).toBeInTheDocument();
  });

  it('displays contract address when present', () => {
    const collections = [
      makeCollection({
        contractAddress: '0xaabbccddee1234567890aabbccddee1234567890',
      }),
    ];

    render(<CollectionList collections={collections} />);

    expect(screen.getByText('0xaabbccddee1234567890aabbccddee1234567890')).toBeInTheDocument();
  });

  it('displays provider badge with underscore replaced by space', () => {
    const collections = [makeCollection({ provider: 'zora_protocol' })];

    render(<CollectionList collections={collections} />);

    expect(screen.getByText('zora protocol')).toBeInTheDocument();
  });

  it('displays token standard in uppercase', () => {
    const collections = [makeCollection({ tokenStandard: 'erc1155' })];

    render(<CollectionList collections={collections} />);

    expect(screen.getByText('ERC1155')).toBeInTheDocument();
  });

  it('displays dash when tokenStandard is undefined', () => {
    const collections = [makeCollection({ tokenStandard: undefined })];

    render(<CollectionList collections={collections} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows Active status for active collections', () => {
    const collections = [makeCollection({ isActive: true })];

    render(<CollectionList collections={collections} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows Inactive status for inactive collections', () => {
    const collections = [makeCollection({ isActive: false })];

    render(<CollectionList collections={collections} />);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('calls onToggleActive when status button is clicked', () => {
    const onToggleActive = vi.fn();
    const collections = [makeCollection({ id: 'col-1', isActive: true })];

    render(<CollectionList collections={collections} onToggleActive={onToggleActive} />);

    fireEvent.click(screen.getByText('Active'));
    expect(onToggleActive).toHaveBeenCalledWith('col-1', false);
  });

  it('calls onToggleActive with true when inactive item is clicked', () => {
    const onToggleActive = vi.fn();
    const collections = [makeCollection({ id: 'col-2', isActive: false })];

    render(<CollectionList collections={collections} onToggleActive={onToggleActive} />);

    fireEvent.click(screen.getByText('Inactive'));
    expect(onToggleActive).toHaveBeenCalledWith('col-2', true);
  });

  it('renders Edit link for each collection', () => {
    const collections = [
      makeCollection({ id: 'col-1' }),
      makeCollection({ id: 'col-2', name: 'Second' }),
    ];

    render(<CollectionList collections={collections} />);

    const editLinks = screen.getAllByText('Edit');
    expect(editLinks).toHaveLength(2);
    expect(editLinks[0].closest('a')).toHaveAttribute('href', '/admin/collections/col-1');
    expect(editLinks[1].closest('a')).toHaveAttribute('href', '/admin/collections/col-2');
  });

  it('applies custom className', () => {
    const { container } = render(<CollectionList collections={[]} className="custom-class" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('does not error when onToggleActive is not provided', () => {
    const collections = [makeCollection({ isActive: true })];

    render(<CollectionList collections={collections} />);

    // Should not throw when clicking without handler
    expect(() => fireEvent.click(screen.getByText('Active'))).not.toThrow();
  });
});
