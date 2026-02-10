import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { MintActivityFeed } from '@/components/admin/MintActivityFeed';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface MintActivity {
  id: string;
  minterAddress: string;
  quantity: number;
  txHash: string | null;
  provider: string;
  status: string;
  createdAt: string;
}

function makeMint(overrides: Partial<MintActivity> = {}): MintActivity {
  return {
    id: 'mint-1',
    minterAddress: '0x1234567890abcdef1234567890abcdef12345678',
    quantity: 1,
    txHash: '0xabc123def456',
    provider: 'onchainkit',
    status: 'confirmed',
    createdAt: '2024-06-15T12:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('MintActivityFeed mock contract validation', () => {
  it('component renders without external mocks (presentational)', () => {
    // MintActivityFeed is purely presentational, no hooks to mock.
    // Validate that the component exports correctly and renders.
    const mints = [makeMint()];
    const { container } = render(<MintActivityFeed mints={mints} />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('MintActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no mints', () => {
    render(<MintActivityFeed mints={[]} />);

    expect(screen.getByText('Recent Mints')).toBeInTheDocument();
    expect(screen.getByText('No mint activity yet.')).toBeInTheDocument();
  });

  it('renders mint events with truncated addresses', () => {
    const mints = [
      makeMint({
        id: 'mint-1',
        minterAddress: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
      }),
    ];

    render(<MintActivityFeed mints={mints} />);

    // Address should be truncated: first 6 chars ... last 4 chars
    expect(screen.getByText('0xAbCd...Ef12')).toBeInTheDocument();
  });

  it('renders quantity for each mint', () => {
    const mints = [makeMint({ quantity: 5 })];

    render(<MintActivityFeed mints={mints} />);

    expect(screen.getByText('x5')).toBeInTheDocument();
  });

  it('renders status badges with correct text', () => {
    const mints = [
      makeMint({ id: 'mint-1', status: 'confirmed' }),
      makeMint({ id: 'mint-2', status: 'pending' }),
      makeMint({ id: 'mint-3', status: 'failed' }),
    ];

    render(<MintActivityFeed mints={mints} />);

    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('renders confirmed badge with green styling', () => {
    const mints = [makeMint({ status: 'confirmed' })];

    render(<MintActivityFeed mints={mints} />);

    const badge = screen.getByText('confirmed');
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-800');
  });

  it('renders pending badge with yellow styling', () => {
    const mints = [makeMint({ status: 'pending' })];

    render(<MintActivityFeed mints={mints} />);

    const badge = screen.getByText('pending');
    expect(badge.className).toContain('bg-yellow-100');
    expect(badge.className).toContain('text-yellow-800');
  });

  it('renders failed badge with red styling', () => {
    const mints = [makeMint({ status: 'failed' })];

    render(<MintActivityFeed mints={mints} />);

    const badge = screen.getByText('failed');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-800');
  });

  it('renders unknown status with gray styling', () => {
    const mints = [makeMint({ status: 'unknown' })];

    render(<MintActivityFeed mints={mints} />);

    const badge = screen.getByText('unknown');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-800');
  });

  it('renders tx link when txHash is present', () => {
    const mints = [makeMint({ txHash: '0xdeadbeef123' })];

    render(<MintActivityFeed mints={mints} />);

    const txLink = screen.getByText('tx');
    expect(txLink).toBeInTheDocument();
    expect(txLink).toHaveAttribute('href', 'https://basescan.org/tx/0xdeadbeef123');
    expect(txLink).toHaveAttribute('target', '_blank');
    expect(txLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not render tx link when txHash is null', () => {
    const mints = [makeMint({ txHash: null })];

    render(<MintActivityFeed mints={mints} />);

    expect(screen.queryByText('tx')).not.toBeInTheDocument();
  });

  it('displays provider with underscore replaced by space', () => {
    const mints = [makeMint({ provider: 'zora_protocol' })];

    render(<MintActivityFeed mints={mints} />);

    expect(screen.getByText('zora protocol')).toBeInTheDocument();
  });

  it('limits display to 10 mints', () => {
    const mints = Array.from({ length: 15 }, (_, i) =>
      makeMint({
        id: `mint-${i}`,
        minterAddress: `0x${String(i).padStart(40, '0')}`,
      })
    );

    render(<MintActivityFeed mints={mints} />);

    // The component slices to first 10
    const mintRows = screen
      .getByText('Recent Mints')
      .closest('div')!
      .querySelectorAll('.flex.items-center.justify-between');
    expect(mintRows).toHaveLength(10);
  });

  it('applies custom className', () => {
    const { container } = render(<MintActivityFeed mints={[]} className="my-class" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('my-class');
  });

  it('renders the heading for both empty and populated states', () => {
    const { rerender } = render(<MintActivityFeed mints={[]} />);
    expect(screen.getByText('Recent Mints')).toBeInTheDocument();

    rerender(<MintActivityFeed mints={[makeMint()]} />);
    expect(screen.getByText('Recent Mints')).toBeInTheDocument();
  });
});
