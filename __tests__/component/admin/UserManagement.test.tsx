import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { UserWithRole, UserRole } from '@/types/admin';

import { UserManagement } from '@/components/admin/UserManagement';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeUser(overrides: Partial<UserWithRole> = {}): UserWithRole {
  return {
    id: 'user-1',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    username: 'testuser',
    role: 'user' as UserRole,
    createdAt: '2024-01-01T00:00:00Z',
    lastSeenAt: '2024-06-15T12:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('UserManagement mock contract validation', () => {
  it('component receives data and callbacks via props (no external hooks to mock)', () => {
    const onUpdateRole = vi.fn();
    const { container } = render(<UserManagement users={[]} onUpdateRole={onUpdateRole} />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('UserManagement', () => {
  let onUpdateRole: Mock<(address: string, role: UserRole) => Promise<void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    onUpdateRole = vi
      .fn<(address: string, role: UserRole) => Promise<void>>()
      .mockResolvedValue(undefined);
  });

  it('renders empty state when no users', () => {
    render(<UserManagement users={[]} onUpdateRole={onUpdateRole} />);

    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<UserManagement users={[makeUser()]} onUpdateRole={onUpdateRole} />);

    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Last Seen')).toBeInTheDocument();
  });

  it('renders user rows with truncated addresses', () => {
    const users = [
      makeUser({
        address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
        username: 'alice',
      }),
    ];

    render(<UserManagement users={users} onUpdateRole={onUpdateRole} />);

    expect(screen.getByText('0xAbCd...Ef12')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('renders dash when username is undefined', () => {
    const users = [makeUser({ username: undefined })];

    render(<UserManagement users={users} onUpdateRole={onUpdateRole} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders role select with all role options', () => {
    const users = [makeUser({ role: 'admin' })];

    render(<UserManagement users={users} onUpdateRole={onUpdateRole} />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('admin');

    // All 3 options should be available
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.textContent)).toEqual(['user', 'admin', 'superadmin']);
  });

  it('calls onUpdateRole when role is changed', async () => {
    const users = [
      makeUser({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        role: 'user',
      }),
    ];

    render(<UserManagement users={users} onUpdateRole={onUpdateRole} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'admin' } });

    await waitFor(() => {
      expect(onUpdateRole).toHaveBeenCalledWith(
        '0x1234567890abcdef1234567890abcdef12345678',
        'admin'
      );
    });
  });

  it('disables select while role update is in progress', async () => {
    // onUpdateRole returns a never-resolving promise to simulate loading
    let resolveUpdate: () => void;
    onUpdateRole = vi.fn<(address: string, role: UserRole) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        })
    );

    const users = [
      makeUser({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        role: 'user',
      }),
    ];

    render(<UserManagement users={users} onUpdateRole={onUpdateRole} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'admin' } });

    await waitFor(() => {
      expect(select).toBeDisabled();
    });

    // Resolve the update
    resolveUpdate!();
    await waitFor(() => {
      expect(select).not.toBeDisabled();
    });
  });

  it('renders multiple user rows', () => {
    const users = [
      makeUser({
        id: 'u1',
        address: '0xaaaa000000000000000000000000000000001111',
        username: 'alice',
      }),
      makeUser({
        id: 'u2',
        address: '0xbbbb000000000000000000000000000000002222',
        username: 'bob',
      }),
      makeUser({
        id: 'u3',
        address: '0xcccc000000000000000000000000000000003333',
        username: 'charlie',
      }),
    ];

    render(<UserManagement users={users} onUpdateRole={onUpdateRole} />);

    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('charlie')).toBeInTheDocument();

    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(3);
  });

  it('applies custom className', () => {
    const { container } = render(
      <UserManagement users={[]} onUpdateRole={onUpdateRole} className="user-mgmt" />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('user-mgmt');
  });
});
