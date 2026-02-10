import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuditLogEntry } from '@/app/api/user/audit-log/route';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the config module to control the feature flag
vi.mock('@/lib/config', () => ({
  features: {
    showUserAuditLog: true,
  },
}));

import { features } from '@/lib/config';
import { UserAuditLog } from '@/components/profile/UserAuditLog';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('config mock contract validation', () => {
  it('mock provides features.showUserAuditLog flag', () => {
    expect(features).toHaveProperty('showUserAuditLog');
    expect(typeof features.showUserAuditLog).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEntry(overrides?: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: 'entry-1',
    endpoint: '/api/test',
    method: 'GET',
    response_status: 200,
    response_time_ms: 42,
    created_at: '2024-06-15T10:30:00Z',
    ...overrides,
  };
}

function mockFetchSuccess(entries: AuditLogEntry[], total?: number) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        entries,
        total: total ?? entries.length,
        limit: 10,
        offset: 0,
      }),
  });
}

function mockFetchError(status = 500) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: 'Server error' }),
  });
}

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('UserAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the feature flag to enabled for each test
    (features as { showUserAuditLog: boolean }).showUserAuditLog = true;
  });

  it('renders nothing when feature flag is disabled', () => {
    (features as { showUserAuditLog: boolean }).showUserAuditLog = false;

    const { container } = render(<UserAuditLog />);

    expect(container.innerHTML).toBe('');
  });

  it('shows loading state initially', () => {
    // Set up a fetch that never resolves to keep loading state
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(<UserAuditLog />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error message on fetch failure', async () => {
    mockFetchError(500);

    render(<UserAuditLog />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load audit log')).toBeInTheDocument();
    });
  });

  it('shows "not enabled" error on 404', async () => {
    mockFetchError(404);

    render(<UserAuditLog />);

    await waitFor(() => {
      expect(screen.getByText('Audit log feature is not enabled')).toBeInTheDocument();
    });
  });

  it('shows empty state when no entries', async () => {
    mockFetchSuccess([]);

    render(<UserAuditLog />);

    await waitFor(() => {
      expect(screen.getByText('No activity recorded yet.')).toBeInTheDocument();
    });
  });

  it('renders audit log entries in a table', async () => {
    const entries = [
      makeEntry({
        id: 'e1',
        endpoint: '/api/nft/collections',
        method: 'GET',
        response_status: 200,
        response_time_ms: 15,
      }),
      makeEntry({
        id: 'e2',
        endpoint: '/api/user/profile',
        method: 'POST',
        response_status: 201,
        response_time_ms: 55,
      }),
    ];
    mockFetchSuccess(entries);

    render(<UserAuditLog />);

    await waitFor(() => {
      expect(screen.getByText('/api/nft/collections')).toBeInTheDocument();
    });

    expect(screen.getByText('/api/user/profile')).toBeInTheDocument();
    // Check table headers
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.getByText('Endpoint')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders heading and description', async () => {
    mockFetchSuccess([]);

    render(<UserAuditLog />);

    await waitFor(() => {
      expect(screen.getByText('Activity Log')).toBeInTheDocument();
    });
    expect(screen.getByText('Your recent API activity and requests.')).toBeInTheDocument();
  });

  it('shows pagination when total exceeds limit', async () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry({ id: `e${i}`, endpoint: `/api/test/${i}` })
    );
    mockFetchSuccess(entries, 25);

    render(<UserAuditLog />);

    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText(/Showing 1-10 of 25/)).toBeInTheDocument();
  });

  it('Previous button is disabled on first page', async () => {
    const entries = Array.from({ length: 10 }, (_, i) => makeEntry({ id: `e${i}` }));
    mockFetchSuccess(entries, 25);

    render(<UserAuditLog />);

    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    expect(screen.getByText('Previous')).toBeDisabled();
    expect(screen.getByText('Next')).toBeEnabled();
  });

  it('fetches next page when Next is clicked', async () => {
    const entries = Array.from({ length: 10 }, (_, i) => makeEntry({ id: `e${i}` }));
    mockFetchSuccess(entries, 25);
    const user = userEvent.setup();

    render(<UserAuditLog />);

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Next'));

    // After clicking Next, fetch should be called again with offset=10
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('offset=10'));
    });
  });
});
