import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
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

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  Home: (props: Record<string, unknown>) => <span data-testid="icon-Home" {...props} />,
  User: (props: Record<string, unknown>) => <span data-testid="icon-User" {...props} />,
}));

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { MobileNav } from '@/components/layout/MobileNav';

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

function mockPathname(pathname: string) {
  (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(pathname);
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('MobileNav mock contract validation', () => {
  it('useAuth mock is a vi mock function', () => {
    expect(vi.isMockFunction(useAuth)).toBe(true);
  });

  it('usePathname mock is a vi mock function', () => {
    expect(vi.isMockFunction(usePathname)).toBe(true);
  });

  it('lucide-react mock renders icons with data-testid', () => {
    mockUseAuth({ isLoggedIn: false });
    mockPathname('/');
    render(<MobileNav />);
    expect(screen.getByTestId('icon-Home')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('MobileNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always renders Home link', () => {
    mockUseAuth({ isLoggedIn: false });
    mockPathname('/');

    render(<MobileNav />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
  });

  it('shows Profile link when user is logged in', () => {
    mockUseAuth({ isLoggedIn: true });
    mockPathname('/');

    render(<MobileNav />);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Profile').closest('a')).toHaveAttribute('href', '/profile');
  });

  it('hides Profile link when user is not logged in', () => {
    mockUseAuth({ isLoggedIn: false });
    mockPathname('/');

    render(<MobileNav />);

    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
  });

  it('marks the active link with aria-current="page"', () => {
    mockUseAuth({ isLoggedIn: true });
    mockPathname('/');

    render(<MobileNav />);

    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('aria-current', 'page');

    const profileLink = screen.getByText('Profile').closest('a');
    expect(profileLink).not.toHaveAttribute('aria-current');
  });

  it('marks Profile as active when pathname is /profile', () => {
    mockUseAuth({ isLoggedIn: true });
    mockPathname('/profile');

    render(<MobileNav />);

    const profileLink = screen.getByText('Profile').closest('a');
    expect(profileLink).toHaveAttribute('aria-current', 'page');

    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).not.toHaveAttribute('aria-current');
  });

  it('has navigation with aria-label "Mobile navigation"', () => {
    mockUseAuth({ isLoggedIn: false });
    mockPathname('/');

    render(<MobileNav />);

    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
  });

  it('accepts and applies className prop', () => {
    mockUseAuth({ isLoggedIn: false });
    mockPathname('/');

    render(<MobileNav className="custom-class" />);

    const nav = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(nav).toHaveClass('custom-class');
  });
});
