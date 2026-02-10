import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@coinbase/onchainkit/wallet', () => ({
  ConnectWallet: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="connect-wallet" {...props}>
      {children}
    </div>
  ),
  Wallet: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="wallet">{children}</div>
  ),
}));

import { useAccount } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';
import { SignInButton } from '@/components/auth/SignInButton';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockUseAccount(overrides?: { isConnected?: boolean }) {
  (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
    isConnected: false,
    address: undefined,
    ...overrides,
  });
}

function mockUseAuth(overrides?: {
  isLoggedIn?: boolean;
  isLoading?: boolean;
  signIn?: ReturnType<typeof vi.fn>;
}) {
  const defaults = {
    isLoggedIn: false,
    isLoading: false,
    isWalletConnected: false,
    walletAddress: undefined,
    isFarcasterAuth: false,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
  };
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    ...defaults,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('SignInButton mock contract validation', () => {
  it('useAccount mock is a vi mock function', () => {
    expect(vi.isMockFunction(useAccount)).toBe(true);
  });

  it('useAuth mock is a vi mock function', () => {
    expect(vi.isMockFunction(useAuth)).toBe(true);
  });

  it('useAccount mock returns expected shape', () => {
    mockUseAccount({ isConnected: true });
    const result = useAccount();
    expect(result).toHaveProperty('isConnected');
  });

  it('useAuth mock returns expected shape', () => {
    mockUseAuth({ isLoggedIn: true });
    const result = useAuth();
    expect(result).toHaveProperty('isLoggedIn');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('signIn');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('SignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows ConnectWallet when wallet is not connected', () => {
    mockUseAccount({ isConnected: false });
    mockUseAuth({ isLoggedIn: false });

    render(<SignInButton />);

    expect(screen.getByTestId('wallet')).toBeInTheDocument();
    expect(screen.getByTestId('connect-wallet')).toBeInTheDocument();
  });

  it('returns null when user is already logged in', () => {
    mockUseAccount({ isConnected: true });
    mockUseAuth({ isLoggedIn: true });

    const { container } = render(<SignInButton />);

    expect(container.innerHTML).toBe('');
  });

  it('shows "Sign In" button when connected but not logged in', () => {
    mockUseAccount({ isConnected: true });
    mockUseAuth({ isLoggedIn: false });

    render(<SignInButton />);

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('calls signIn when "Sign In" button is clicked', async () => {
    const mockSignIn = vi.fn().mockResolvedValue(undefined);
    mockUseAccount({ isConnected: true });
    mockUseAuth({ isLoggedIn: false, signIn: mockSignIn });

    render(<SignInButton />);

    const button = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onSuccess callback after successful sign-in', async () => {
    const mockSignIn = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    mockUseAccount({ isConnected: true });
    mockUseAuth({ isLoggedIn: false, signIn: mockSignIn });

    render(<SignInButton onSuccess={onSuccess} />);

    const button = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onError callback when sign-in fails', async () => {
    const signInError = new Error('Sign in failed');
    const mockSignIn = vi.fn().mockRejectedValue(signInError);
    const onError = vi.fn();
    mockUseAccount({ isConnected: true });
    mockUseAuth({ isLoggedIn: false, signIn: mockSignIn });

    render(<SignInButton onError={onError} />);

    const button = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(signInError);
    });
  });
});
