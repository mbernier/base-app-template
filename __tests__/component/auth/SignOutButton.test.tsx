import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
import { SignOutButton } from '@/components/auth/SignOutButton';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockUseAuth(overrides?: { isLoggedIn?: boolean; signOut?: ReturnType<typeof vi.fn> }) {
  const defaults = {
    isLoggedIn: false,
    isLoading: false,
    isWalletConnected: false,
    walletAddress: undefined,
    isFarcasterAuth: false,
    signIn: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
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
describe('SignOutButton mock contract validation', () => {
  it('useAuth mock is a vi mock function', () => {
    expect(vi.isMockFunction(useAuth)).toBe(true);
  });

  it('useAuth mock returns expected shape', () => {
    mockUseAuth({ isLoggedIn: true });
    const result = useAuth();
    expect(result).toHaveProperty('isLoggedIn');
    expect(result).toHaveProperty('signOut');
    expect(typeof result.signOut).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('SignOutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when user is not logged in', () => {
    mockUseAuth({ isLoggedIn: false });

    const { container } = render(<SignOutButton />);

    expect(container.innerHTML).toBe('');
  });

  it('shows "Sign Out" button when user is logged in', () => {
    mockUseAuth({ isLoggedIn: true });

    render(<SignOutButton />);

    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
  });

  it('calls signOut when "Sign Out" button is clicked', async () => {
    const mockSignOut = vi.fn().mockResolvedValue(undefined);
    mockUseAuth({ isLoggedIn: true, signOut: mockSignOut });

    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: 'Sign Out' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onSuccess callback after successful sign-out', async () => {
    const mockSignOut = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    mockUseAuth({ isLoggedIn: true, signOut: mockSignOut });

    render(<SignOutButton onSuccess={onSuccess} />);

    const button = screen.getByRole('button', { name: 'Sign Out' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
