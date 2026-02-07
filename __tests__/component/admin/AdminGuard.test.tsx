import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useAdmin', () => ({
  useAdmin: vi.fn(),
}));

// Mock AuthGuard to just render children (it handles auth, which we are not testing here)
vi.mock('@/components/auth/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-guard">{children}</div>
  ),
}));

import { useAdmin } from '@/hooks/useAdmin';
import { AdminGuard } from '@/components/admin/AdminGuard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface MockAdminState {
  role?: string | null;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

function mockAdminHook(overrides?: MockAdminState) {
  const defaults = {
    role: null,
    isAdmin: false,
    isSuperAdmin: false,
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
describe('useAdmin mock contract validation', () => {
  it('mock returns expected shape', () => {
    // Validate that the vi.mock replaced the module with our mock function
    expect(typeof useAdmin).toBe('function');
    expect(vi.isMockFunction(useAdmin)).toBe(true);
  });

  it('mock returns the correct return type when configured', () => {
    (useAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      role: 'admin',
      isAdmin: true,
      isSuperAdmin: false,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const result = useAdmin();
    expect(result).toHaveProperty('role');
    expect(result).toHaveProperty('isAdmin');
    expect(result).toHaveProperty('isSuperAdmin');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('refetch');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('AdminGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state with "Checking permissions..." message', () => {
    mockAdminHook({ isLoading: true });

    render(
      <AdminGuard>
        <p>Admin Content</p>
      </AdminGuard>
    );

    expect(screen.getByText('Checking permissions...')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('shows "Access Denied" for non-admin user', () => {
    mockAdminHook({ isAdmin: false, role: 'user' });

    render(
      <AdminGuard>
        <p>Admin Content</p>
      </AdminGuard>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('Admin access is required for this page.')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('shows children for admin user', () => {
    mockAdminHook({ isAdmin: true, role: 'admin' });

    render(
      <AdminGuard>
        <p>Admin Content</p>
      </AdminGuard>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });

  it('shows "Access Denied" when requireSuperAdmin and user is only admin', () => {
    mockAdminHook({ isAdmin: true, isSuperAdmin: false, role: 'admin' });

    render(
      <AdminGuard requireSuperAdmin>
        <p>Super Admin Content</p>
      </AdminGuard>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(
      screen.getByText('Super admin access is required for this page.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Super Admin Content')).not.toBeInTheDocument();
  });

  it('shows children when requireSuperAdmin and user is superadmin', () => {
    mockAdminHook({ isAdmin: true, isSuperAdmin: true, role: 'superadmin' });

    render(
      <AdminGuard requireSuperAdmin>
        <p>Super Admin Content</p>
      </AdminGuard>
    );

    expect(screen.getByText('Super Admin Content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });
});
