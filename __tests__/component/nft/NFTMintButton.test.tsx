import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MintStatus } from '@/types/nft';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockMint = vi.fn();
const mockReset = vi.fn();

vi.mock('@/hooks/useNFTMint', () => ({
  useNFTMint: vi.fn(),
}));

import { useNFTMint } from '@/hooks/useNFTMint';
import { NFTMintButton } from '@/components/nft/NFTMintButton';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface MockMintState {
  status?: MintStatus | 'idle';
  txHash?: string;
  mintId?: string;
  isLoading?: boolean;
  error?: string | null;
}

function mockMintHook(overrides?: MockMintState) {
  const defaults = {
    mint: mockMint,
    status: 'idle' as const,
    txHash: undefined,
    mintId: undefined,
    isLoading: false,
    error: null,
    reset: mockReset,
  };
  (useNFTMint as ReturnType<typeof vi.fn>).mockReturnValue({
    ...defaults,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('useNFTMint mock contract validation', () => {
  it('mock returns expected shape', () => {
    // Validate that the vi.mock replaced the module with our mock function
    expect(typeof useNFTMint).toBe('function');
    expect(vi.isMockFunction(useNFTMint)).toBe(true);
  });

  it('mock returns the correct return type when configured', () => {
    (useNFTMint as ReturnType<typeof vi.fn>).mockReturnValue({
      mint: vi.fn(),
      status: 'idle',
      txHash: undefined,
      mintId: undefined,
      isLoading: false,
      error: null,
      reset: vi.fn(),
    });
    const result = useNFTMint();
    expect(result).toHaveProperty('mint');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('txHash');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('reset');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('NFTMintButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mint button in idle state', () => {
    mockMintHook();

    render(<NFTMintButton collectionId="col-1" />);

    const button = screen.getByRole('button', { name: 'Mint' });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it('shows custom buttonText', () => {
    mockMintHook();

    render(<NFTMintButton collectionId="col-1" buttonText="Collect Now" />);

    expect(screen.getByRole('button', { name: 'Collect Now' })).toBeInTheDocument();
  });

  it('shows quantity in button text when quantity is greater than 1', () => {
    mockMintHook();

    render(<NFTMintButton collectionId="col-1" quantity={3} />);

    expect(screen.getByRole('button', { name: 'Mint (3)' })).toBeInTheDocument();
  });

  it('calls mint with correct params when clicked', async () => {
    mockMintHook();
    const user = userEvent.setup();

    render(<NFTMintButton collectionId="col-1" tokenId="tok-5" quantity={2} />);

    await user.click(screen.getByRole('button', { name: 'Mint (2)' }));

    expect(mockMint).toHaveBeenCalledTimes(1);
    expect(mockMint).toHaveBeenCalledWith('col-1', 'tok-5', 2);
  });

  it('shows pending/loading state with MintStatus rendered', () => {
    mockMintHook({ status: 'pending', isLoading: true });

    render(<NFTMintButton collectionId="col-1" />);

    expect(screen.getByText('Minting in progress...')).toBeInTheDocument();
    // The idle mint button should not be present in pending state
    expect(screen.queryByRole('button', { name: 'Mint' })).not.toBeInTheDocument();
  });

  it('shows confirmed state with "Mint Another" button', () => {
    mockMintHook({ status: 'confirmed', txHash: '0xabc123' });

    render(<NFTMintButton collectionId="col-1" />);

    expect(screen.getByText('Mint successful!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mint Another' })).toBeInTheDocument();
  });

  it('shows failed state with "Try Again" button', () => {
    mockMintHook({ status: 'failed', error: 'User rejected' });

    render(<NFTMintButton collectionId="col-1" />);

    expect(screen.getByText('Mint failed')).toBeInTheDocument();
    expect(screen.getByText('User rejected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('calls reset when "Mint Another" is clicked', async () => {
    mockMintHook({ status: 'confirmed', txHash: '0xabc123' });
    const user = userEvent.setup();

    render(<NFTMintButton collectionId="col-1" />);

    await user.click(screen.getByRole('button', { name: 'Mint Another' }));

    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
