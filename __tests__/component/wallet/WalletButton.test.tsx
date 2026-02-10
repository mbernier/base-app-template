import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@coinbase/onchainkit/wallet', () => ({
  Wallet: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wallet-wrapper">{children}</div>
  ),
  ConnectWallet: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="connect-wallet">{children}</button>
  ),
  WalletDropdown: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wallet-dropdown">{children}</div>
  ),
  WalletDropdownLink: ({
    children,
    href,
    icon,
  }: {
    children: React.ReactNode;
    href: string;
    icon: string;
  }) => (
    <a data-testid="wallet-dropdown-link" href={href} data-icon={icon}>
      {children}
    </a>
  ),
  WalletDropdownDisconnect: () => (
    <button data-testid="wallet-dropdown-disconnect">Disconnect</button>
  ),
}));

vi.mock('@coinbase/onchainkit/identity', () => ({
  Avatar: ({ className }: { className?: string }) => (
    <div data-testid="avatar" className={className} />
  ),
  Name: () => <span data-testid="name" />,
  Identity: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    hasCopyAddressOnClick?: boolean;
  }) => (
    <div data-testid="identity" className={className}>
      {children}
    </div>
  ),
  Address: () => <span data-testid="address" />,
}));

import { WalletButton } from '@/components/wallet/WalletButton';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('OnchainKit wallet mock contract validation', () => {
  it('mock provides wallet components', async () => {
    const walletMod = await import('@coinbase/onchainkit/wallet');
    expect(walletMod.Wallet).toBeDefined();
    expect(walletMod.ConnectWallet).toBeDefined();
    expect(walletMod.WalletDropdown).toBeDefined();
    expect(walletMod.WalletDropdownLink).toBeDefined();
    expect(walletMod.WalletDropdownDisconnect).toBeDefined();
  });

  it('mock provides identity components', async () => {
    const identityMod = await import('@coinbase/onchainkit/identity');
    expect(identityMod.Avatar).toBeDefined();
    expect(identityMod.Name).toBeDefined();
    expect(identityMod.Identity).toBeDefined();
    expect(identityMod.Address).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('WalletButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders wallet connect button with avatar and name', () => {
    render(<WalletButton />);

    expect(screen.getByTestId('wallet-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('connect-wallet')).toBeInTheDocument();
    // Avatar and Name are inside ConnectWallet
    const avatars = screen.getAllByTestId('avatar');
    expect(avatars.length).toBeGreaterThanOrEqual(1);
  });

  it('renders wallet dropdown with profile link and disconnect', () => {
    render(<WalletButton />);

    expect(screen.getByTestId('wallet-dropdown')).toBeInTheDocument();

    const profileLink = screen.getByTestId('wallet-dropdown-link');
    expect(profileLink).toHaveAttribute('href', '/profile');
    expect(profileLink.textContent).toBe('Profile');

    expect(screen.getByTestId('wallet-dropdown-disconnect')).toBeInTheDocument();
  });

  it('renders identity section with avatar, name, and address', () => {
    render(<WalletButton />);

    const identity = screen.getByTestId('identity');
    expect(identity).toBeInTheDocument();
    expect(screen.getByTestId('address')).toBeInTheDocument();
  });

  it('applies custom className to wrapper', () => {
    const { container } = render(<WalletButton className="my-custom-class" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('my-custom-class');
  });
});
