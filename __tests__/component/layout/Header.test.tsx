import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children?: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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
  WalletDropdown: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="wallet-dropdown">{children}</div>
  ),
  WalletDropdownLink: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a data-testid="wallet-dropdown-link" {...props}>
      {children}
    </a>
  ),
  WalletDropdownDisconnect: (props: Record<string, unknown>) => (
    <button data-testid="wallet-disconnect" {...props}>
      Disconnect
    </button>
  ),
}));

vi.mock('@coinbase/onchainkit/identity', () => ({
  Avatar: (props: Record<string, unknown>) => <div data-testid="avatar" {...props} />,
  Name: (props: Record<string, unknown>) => <div data-testid="name" {...props} />,
  Identity: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="identity" {...props}>
      {children}
    </div>
  ),
  Address: (props: Record<string, unknown>) => <div data-testid="address" {...props} />,
}));

vi.mock('@/components/wallet/TokenBalance', () => ({
  TokenBalance: () => <div data-testid="token-balance">100 TOKEN</div>,
}));

vi.mock('@/lib/config', () => ({
  app: { name: 'Test App', url: 'http://localhost:3100' },
}));

import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockUseAuth(overrides?: { isLoggedIn?: boolean }) {
  const defaults = {
    isLoggedIn: false,
    isLoading: false,
    isWalletConnected: false,
    walletAddress: undefined,
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
describe('Header mock contract validation', () => {
  it('useAuth mock is a vi mock function', () => {
    expect(vi.isMockFunction(useAuth)).toBe(true);
  });

  it('OnchainKit wallet mocks render with data-testid', () => {
    // Verify the mocks can be rendered by checking import resolution
    mockUseAuth({ isLoggedIn: false });
    render(<Header />);
    expect(screen.getByTestId('wallet')).toBeInTheDocument();
    expect(screen.getByTestId('connect-wallet')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the app name from config', () => {
    mockUseAuth({ isLoggedIn: false });

    render(<Header />);

    expect(screen.getByText('Test App')).toBeInTheDocument();
  });

  it('renders the app name as a link to /', () => {
    mockUseAuth({ isLoggedIn: false });

    render(<Header />);

    const appNameLink = screen.getByText('Test App');
    expect(appNameLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('shows Home link in navigation', () => {
    mockUseAuth({ isLoggedIn: false });

    render(<Header />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
  });

  it('shows Profile link when user is logged in', () => {
    mockUseAuth({ isLoggedIn: true });

    render(<Header />);

    // The nav area has a Profile link (there may also be one in the wallet dropdown)
    const profileLinks = screen.getAllByText('Profile');
    const navProfileLink = profileLinks.find(
      (el) => el.closest('nav[aria-label="Main navigation"]') !== null
    );
    expect(navProfileLink).toBeDefined();
    expect(navProfileLink!.closest('a')).toHaveAttribute('href', '/profile');
  });

  it('hides Profile link in nav when user is not logged in', () => {
    mockUseAuth({ isLoggedIn: false });

    render(<Header />);

    // Profile should only appear in the wallet dropdown, not the main nav
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav).not.toHaveTextContent('Profile');
  });

  it('shows TokenBalance when user is logged in', () => {
    mockUseAuth({ isLoggedIn: true });

    render(<Header />);

    expect(screen.getByTestId('token-balance')).toBeInTheDocument();
  });

  it('hides TokenBalance when user is not logged in', () => {
    mockUseAuth({ isLoggedIn: false });

    render(<Header />);

    expect(screen.queryByTestId('token-balance')).not.toBeInTheDocument();
  });

  it('renders wallet components', () => {
    mockUseAuth({ isLoggedIn: false });

    render(<Header />);

    expect(screen.getByTestId('wallet')).toBeInTheDocument();
    expect(screen.getByTestId('connect-wallet')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-disconnect')).toBeInTheDocument();
  });
});
