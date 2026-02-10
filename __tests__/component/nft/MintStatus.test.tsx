import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div role="status" aria-label="Loading" data-testid={`spinner-${size || 'md'}`}>
      Loading...
    </div>
  ),
}));

import { MintStatus } from '@/components/nft/MintStatus';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

describe('LoadingSpinner mock contract validation', () => {
  it('mock renders with expected role and label', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeTruthy();
    expect(spinner?.getAttribute('aria-label')).toBe('Loading');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('MintStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for idle status', () => {
    const { container } = render(<MintStatus status="idle" />);

    expect(container.innerHTML).toBe('');
  });

  it('shows pending state with spinner and instruction text', () => {
    render(<MintStatus status="pending" />);

    expect(screen.getByText('Minting in progress...')).toBeInTheDocument();
    expect(screen.getByText('Please confirm the transaction in your wallet.')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('shows confirmed state with success message', () => {
    render(<MintStatus status="confirmed" />);

    expect(screen.getByText('Mint successful!')).toBeInTheDocument();
  });

  it('shows confirmed state with transaction link when txHash is provided', () => {
    render(<MintStatus status="confirmed" txHash="0xabc123" />);

    expect(screen.getByText('Mint successful!')).toBeInTheDocument();
    const link = screen.getByText('View transaction');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://basescan.org/tx/0xabc123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not show transaction link when txHash is not provided in confirmed state', () => {
    render(<MintStatus status="confirmed" />);

    expect(screen.queryByText('View transaction')).not.toBeInTheDocument();
  });

  it('shows failed state with error message', () => {
    render(<MintStatus status="failed" error="Insufficient funds" />);

    expect(screen.getByText('Mint failed')).toBeInTheDocument();
    expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
  });

  it('shows failed state without error text when error is not provided', () => {
    render(<MintStatus status="failed" />);

    expect(screen.getByText('Mint failed')).toBeInTheDocument();
    expect(screen.queryByText('Insufficient funds')).not.toBeInTheDocument();
  });
});
