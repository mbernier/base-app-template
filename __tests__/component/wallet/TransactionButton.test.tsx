import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the entire @coinbase/onchainkit/transaction module
vi.mock('@coinbase/onchainkit/transaction', () => ({
  Transaction: ({
    children,
    chainId,
  }: {
    children: React.ReactNode;
    chainId: number;
    calls: unknown[];
    onStatus: (status: unknown) => void;
  }) => (
    <div data-testid="transaction-wrapper" data-chain-id={chainId}>
      {children}
    </div>
  ),
  TransactionButton: ({
    text,
    disabled,
    className,
  }: {
    text: string;
    disabled?: boolean;
    className?: string;
  }) => (
    <button disabled={disabled} className={className} data-testid="tx-button">
      {text}
    </button>
  ),
  TransactionSponsor: () => <div data-testid="tx-sponsor" />,
  TransactionStatus: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tx-status">{children}</div>
  ),
  TransactionStatusLabel: () => <span data-testid="tx-status-label" />,
  TransactionStatusAction: () => <span data-testid="tx-status-action" />,
}));

vi.mock('@/lib/tokens', () => ({
  CHAIN: { id: 8453 },
}));

import { TransactionButtonWrapper } from '@/components/wallet/TransactionButton';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('OnchainKit transaction mock contract validation', () => {
  it('mock provides Transaction component', async () => {
    const mod = await import('@coinbase/onchainkit/transaction');
    expect(mod.Transaction).toBeDefined();
    expect(mod.TransactionButton).toBeDefined();
    expect(mod.TransactionSponsor).toBeDefined();
    expect(mod.TransactionStatus).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCalls() {
  return [
    {
      address: '0x1234567890abcdef1234567890abcdef12345678' as const,
      abi: [] as const,
      functionName: 'mint',
      args: [],
    },
  ];
}

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('TransactionButtonWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default button text', () => {
    render(<TransactionButtonWrapper calls={makeCalls()} />);

    const button = screen.getByTestId('tx-button');
    expect(button).toBeInTheDocument();
    expect(button.textContent).toBe('Submit Transaction');
  });

  it('renders with custom button text', () => {
    render(<TransactionButtonWrapper calls={makeCalls()} buttonText="Mint NFT" />);

    expect(screen.getByTestId('tx-button').textContent).toBe('Mint NFT');
  });

  it('renders disabled button when disabled prop is true', () => {
    render(<TransactionButtonWrapper calls={makeCalls()} disabled={true} />);

    expect(screen.getByTestId('tx-button')).toBeDisabled();
  });

  it('renders Transaction wrapper with correct chain id', () => {
    render(<TransactionButtonWrapper calls={makeCalls()} />);

    expect(screen.getByTestId('transaction-wrapper')).toHaveAttribute('data-chain-id', '8453');
  });

  it('renders TransactionSponsor and TransactionStatus components', () => {
    render(<TransactionButtonWrapper calls={makeCalls()} />);

    expect(screen.getByTestId('tx-sponsor')).toBeInTheDocument();
    expect(screen.getByTestId('tx-status')).toBeInTheDocument();
    expect(screen.getByTestId('tx-status-label')).toBeInTheDocument();
    expect(screen.getByTestId('tx-status-action')).toBeInTheDocument();
  });
});
