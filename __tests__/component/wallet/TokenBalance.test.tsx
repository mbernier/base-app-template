import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useTokenBalance', () => ({
  useTokenBalance: vi.fn(),
}));

vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div role="status" aria-label="Loading" data-testid={`spinner-${size || 'md'}`}>
      Loading...
    </div>
  ),
}));

import { useTokenBalance } from '@/hooks/useTokenBalance';
import { TokenBalance } from '@/components/wallet/TokenBalance';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('useTokenBalance mock contract validation', () => {
  it('mock returns expected shape', () => {
    expect(typeof useTokenBalance).toBe('function');
    expect(vi.isMockFunction(useTokenBalance)).toBe(true);
  });

  it('mock returns the correct return type when configured', () => {
    (useTokenBalance as ReturnType<typeof vi.fn>).mockReturnValue({
      balance: BigInt(1000000),
      balanceFormatted: '1.00',
      isLoading: false,
      refetch: vi.fn(),
      symbol: 'ETH',
    });
    const result = useTokenBalance();
    expect(result).toHaveProperty('balance');
    expect(result).toHaveProperty('balanceFormatted');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('refetch');
    expect(result).toHaveProperty('symbol');
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface MockTokenBalanceState {
  balance?: bigint;
  balanceFormatted?: string;
  isLoading?: boolean;
  symbol?: string;
}

function mockTokenBalanceHook(overrides?: MockTokenBalanceState) {
  const defaults = {
    balance: BigInt(0),
    balanceFormatted: '0.00',
    isLoading: false,
    refetch: vi.fn(),
    symbol: 'TOKEN',
  };
  (useTokenBalance as ReturnType<typeof vi.fn>).mockReturnValue({
    ...defaults,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('TokenBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when isLoading is true', () => {
    mockTokenBalanceHook({ isLoading: true });

    render(<TokenBalance />);

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('shows formatted balance with symbol by default', () => {
    mockTokenBalanceHook({ balanceFormatted: '42.50', symbol: 'ETH' });

    render(<TokenBalance />);

    expect(screen.getByText('42.50')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });

  it('hides symbol when showSymbol is false', () => {
    mockTokenBalanceHook({ balanceFormatted: '42.50', symbol: 'ETH' });

    render(<TokenBalance showSymbol={false} />);

    expect(screen.getByText('42.50')).toBeInTheDocument();
    expect(screen.queryByText('ETH')).not.toBeInTheDocument();
  });

  it('has accessible aria-live and aria-label attributes', () => {
    mockTokenBalanceHook({ balanceFormatted: '100.00', symbol: 'USDC' });

    render(<TokenBalance />);

    const container = screen.getByLabelText('Token balance: 100.00 USDC');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });
});
