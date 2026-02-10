import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock SignInButton since AuthGuard renders it in unauthenticated states
vi.mock('@/components/auth/SignInButton', () => ({
  SignInButton: () => <button data-testid="sign-in-button">Mock SignIn</button>,
}));

import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface MockAuthState {
  isLoggedIn?: boolean;
  isLoading?: boolean;
  isWalletConnected?: boolean;
  walletAddress?: `0x${string}` | undefined;
}

function mockAuthHook(overrides?: MockAuthState) {
  const defaults = {
    isLoggedIn: false,
    isLoading: false,
    isWalletConnected: false,
    walletAddress: undefined as `0x${string}` | undefined,
    isFarcasterAuth: false,
    signIn: vi.fn(),
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
describe('useAuth mock contract validation', () => {
  it('mock is a function and is a vi mock', () => {
    expect(typeof useAuth).toBe('function');
    expect(vi.isMockFunction(useAuth)).toBe(true);
  });

  it('mock returns the correct shape when configured', () => {
    mockAuthHook({
      isLoggedIn: true,
      isLoading: false,
      isWalletConnected: true,
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    });
    const result = useAuth();
    expect(result).toHaveProperty('isLoggedIn');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('isWalletConnected');
    expect(result).toHaveProperty('walletAddress');
    expect(result).toHaveProperty('signIn');
    expect(result).toHaveProperty('signOut');
    expect(result).toHaveProperty('refreshSession');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state with "Checking authentication..." message', () => {
    mockAuthHook({ isLoading: true });

    render(
      <AuthGuard>
        <p>Protected Content</p>
      </AuthGuard>
    );

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is logged in', () => {
    mockAuthHook({ isLoggedIn: true });

    render(
      <AuthGuard>
        <p>Protected Content</p>
      </AuthGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows fallback when not logged in and fallback is provided', () => {
    mockAuthHook({ isLoggedIn: false });

    render(
      <AuthGuard fallback={<p>Custom Fallback</p>}>
        <p>Protected Content</p>
      </AuthGuard>
    );

    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows "Complete Sign-In" when wallet is connected but not signed in', () => {
    mockAuthHook({
      isLoggedIn: false,
      isWalletConnected: true,
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    });

    render(
      <AuthGuard>
        <p>Protected Content</p>
      </AuthGuard>
    );

    expect(screen.getByText('Complete Sign-In')).toBeInTheDocument();
    expect(
      screen.getByText('Sign the message to verify ownership and access this page.')
    ).toBeInTheDocument();
    expect(screen.getByText('0x1234567890abcdef1234567890abcdef12345678')).toBeInTheDocument();
    expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows "Authentication Required" when not connected and no fallback', () => {
    mockAuthHook({
      isLoggedIn: false,
      isWalletConnected: false,
    });

    render(
      <AuthGuard>
        <p>Protected Content</p>
      </AuthGuard>
    );

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('Please connect your wallet to continue.')).toBeInTheDocument();
    expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects when redirectTo is set and user is not logged in', () => {
    mockAuthHook({ isLoggedIn: false });

    render(
      <AuthGuard redirectTo="/login">
        <p>Protected Content</p>
      </AuthGuard>
    );

    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
