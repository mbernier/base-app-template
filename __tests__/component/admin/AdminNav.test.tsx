import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useAdmin', () => ({
  useAdmin: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockUsePathname = vi.fn(() => '/admin');
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

import { useAdmin } from '@/hooks/useAdmin';
import { AdminNav } from '@/components/admin/AdminNav';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockAdminHook(overrides: Partial<ReturnType<typeof useAdmin>> = {}) {
  const defaults: ReturnType<typeof useAdmin> = {
    role: 'admin',
    isAdmin: true,
    isSuperAdmin: false,
    permissions: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
  (useAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
    ...defaults,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('AdminNav mock contract validation', () => {
  it('useAdmin mock returns expected shape', () => {
    expect(typeof useAdmin).toBe('function');
    expect(vi.isMockFunction(useAdmin)).toBe(true);
  });

  it('useAdmin mock returns correct return type when configured', () => {
    mockAdminHook({ isSuperAdmin: true });
    const result = useAdmin();
    expect(result).toHaveProperty('role');
    expect(result).toHaveProperty('isAdmin');
    expect(result).toHaveProperty('isSuperAdmin');
    expect(result).toHaveProperty('permissions');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('refetch');
  });

  it('next/link mock renders an anchor element', () => {
    mockAdminHook();
    render(<AdminNav />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    // Verify the mock renders actual <a> tags with href
    expect(links[0]).toHaveAttribute('href');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('AdminNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/admin');
  });

  it('renders standard navigation links for admin user', () => {
    mockAdminHook({ isSuperAdmin: false });

    render(<AdminNav />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Collections')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    // Users link should NOT be shown for non-superadmin
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  it('renders Users link for superadmin', () => {
    mockAdminHook({ isSuperAdmin: true });

    render(<AdminNav />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Collections')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('highlights Dashboard link when pathname is /admin', () => {
    mockAdminHook({ isSuperAdmin: false });
    mockUsePathname.mockReturnValue('/admin');

    render(<AdminNav />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.className).toContain('bg-blue-100');
    expect(dashboardLink?.className).toContain('text-blue-800');
  });

  it('highlights Collections link when pathname starts with /admin/collections', () => {
    mockAdminHook({ isSuperAdmin: false });
    mockUsePathname.mockReturnValue('/admin/collections/new');

    render(<AdminNav />);

    const collectionsLink = screen.getByText('Collections').closest('a');
    expect(collectionsLink?.className).toContain('bg-blue-100');
    expect(collectionsLink?.className).toContain('text-blue-800');

    // Dashboard should NOT be active
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.className).not.toContain('bg-blue-100');
  });

  it('highlights Settings link when pathname is /admin/settings', () => {
    mockAdminHook({ isSuperAdmin: false });
    mockUsePathname.mockReturnValue('/admin/settings');

    render(<AdminNav />);

    const settingsLink = screen.getByText('Settings').closest('a');
    expect(settingsLink?.className).toContain('bg-blue-100');
    expect(settingsLink?.className).toContain('text-blue-800');
  });

  it('has correct href for each nav link', () => {
    mockAdminHook({ isSuperAdmin: true });

    render(<AdminNav />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const collectionsLink = screen.getByText('Collections').closest('a');
    const settingsLink = screen.getByText('Settings').closest('a');
    const usersLink = screen.getByText('Users').closest('a');

    expect(dashboardLink).toHaveAttribute('href', '/admin');
    expect(collectionsLink).toHaveAttribute('href', '/admin/collections');
    expect(settingsLink).toHaveAttribute('href', '/admin/settings');
    expect(usersLink).toHaveAttribute('href', '/admin/users');
  });

  it('renders the admin heading', () => {
    mockAdminHook({ isSuperAdmin: false });

    render(<AdminNav />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('has accessible navigation landmark', () => {
    mockAdminHook({ isSuperAdmin: false });

    render(<AdminNav />);

    const nav = screen.getByRole('navigation', { name: /admin navigation/i });
    expect(nav).toBeInTheDocument();
  });
});
