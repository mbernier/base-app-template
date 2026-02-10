import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(() => []),
      has: vi.fn(() => false),
      toString: vi.fn(() => ''),
    })
  ),
}));

// Mock iron-session
vi.mock('iron-session', () => ({
  getIronSession: vi.fn(() =>
    Promise.resolve({
      isLoggedIn: false,
      save: vi.fn(),
    })
  ),
}));

// Mock config
vi.mock('../config', () => ({
  auth: {
    sessionSecret: 'test-secret-at-least-32-characters-long',
    sessionDuration: 86400,
    siweDomain: 'localhost',
    siweStatement: 'Sign in',
  },
  app: {
    url: 'http://localhost:3100',
    isProduction: false,
  },
  rateLimit: {
    windowMs: 60000,
    maxRequests: 5,
  },
}));

// Mock admin-permissions hasPermission (external DB dependency)
vi.mock('../admin-permissions', () => ({
  hasPermission: vi.fn().mockResolvedValue(false),
}));

// Mock admin isAdmin (external DB dependency)
vi.mock('../admin', () => ({
  isAdmin: vi.fn().mockResolvedValue(false),
}));

import { getIronSession } from 'iron-session';
import { hasPermission } from '../admin-permissions';
import { isAdmin } from '../admin';

// Contract validation: verify rate limit config mock
describe('rate limit config mock contract validation', () => {
  it('mock rateLimit config has expected keys', async () => {
    const { rateLimit } = await import('../config');
    expect(rateLimit).toHaveProperty('windowMs');
    expect(rateLimit).toHaveProperty('maxRequests');
    expect(typeof rateLimit.windowMs).toBe('number');
    expect(typeof rateLimit.maxRequests).toBe('number');
  });
});

// Contract validation: iron-session mock
describe('iron-session mock contract validation', () => {
  it('getIronSession returns an object with session properties', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await vi.mocked(getIronSession).getMockImplementation()!(
      undefined as any,
      undefined as any,
      undefined as any
    );
    expect(session).toHaveProperty('isLoggedIn');
    expect(session).toHaveProperty('save');
    expect(typeof session.save).toBe('function');
  });
});

// Contract validation: admin-permissions mock
describe('admin-permissions mock contract validation', () => {
  it('hasPermission returns a boolean promise', async () => {
    const result = await vi.mocked(hasPermission)('0x123', 'manage_users' as never);
    expect(typeof result).toBe('boolean');
  });
});

// Contract validation: admin mock
describe('admin mock contract validation', () => {
  it('isAdmin returns a boolean promise', async () => {
    const result = await vi.mocked(isAdmin)('0x123');
    expect(typeof result).toBe('boolean');
  });
});

describe('rateLimit', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should allow requests within limit', async () => {
    const { rateLimit } = await import('../middleware');

    for (let i = 0; i < 5; i++) {
      expect(rateLimit(`test-allow-${Date.now()}-unique`, 60000, 5)).toBe(true);
    }
  });

  it('should block requests exceeding limit', async () => {
    const { rateLimit } = await import('../middleware');
    const id = `test-block-${Date.now()}`;

    // Use up all allowed requests
    for (let i = 0; i < 5; i++) {
      rateLimit(id, 60000, 5);
    }

    // Next request should be blocked
    expect(rateLimit(id, 60000, 5)).toBe(false);
  });

  it('should track different identifiers separately', async () => {
    const { rateLimit } = await import('../middleware');
    const ts = Date.now();

    // Use up limit for identifier A
    for (let i = 0; i < 5; i++) {
      rateLimit(`id-a-${ts}`, 60000, 5);
    }
    expect(rateLimit(`id-a-${ts}`, 60000, 5)).toBe(false);

    // Identifier B should still be allowed
    expect(rateLimit(`id-b-${ts}`, 60000, 5)).toBe(true);
  });
});

describe('requireRateLimit', () => {
  it('should return null when within rate limit', async () => {
    const { requireRateLimit } = await import('../middleware');
    const request = new Request('http://localhost:3100/api/test', {
      headers: { 'x-forwarded-for': `unique-ip-${Date.now()}` },
    });

    // NextRequest requires a NextURL-compatible object
    const result = requireRateLimit(request as never);
    expect(result).toBeNull();
  });
});

describe('requirePermissionMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not logged in', async () => {
    // Default mock: isLoggedIn = false
    vi.mocked(getIronSession).mockResolvedValueOnce({
      isLoggedIn: false,
      save: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { requirePermissionMiddleware } = await import('../middleware');
    const request = new Request('http://localhost:3100/api/admin/test');

    const result = await requirePermissionMiddleware(request as never, 'manage_users' as never);

    expect(result).not.toBeNull();
    const body = await result!.json();
    expect(result!.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('returns 403 when permission not granted', async () => {
    vi.mocked(getIronSession).mockResolvedValueOnce({
      isLoggedIn: true,
      address: '0x1234567890123456789012345678901234567890',
      save: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(hasPermission).mockResolvedValueOnce(false);

    const { requirePermissionMiddleware } = await import('../middleware');
    const request = new Request('http://localhost:3100/api/admin/test');

    const result = await requirePermissionMiddleware(request as never, 'manage_users' as never);

    expect(result).not.toBeNull();
    const body = await result!.json();
    expect(result!.status).toBe(403);
    expect(body.error).toContain('Permission required');
  });

  it('returns null when permission is granted', async () => {
    vi.mocked(getIronSession).mockResolvedValueOnce({
      isLoggedIn: true,
      address: '0x1234567890123456789012345678901234567890',
      save: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(hasPermission).mockResolvedValueOnce(true);

    const { requirePermissionMiddleware } = await import('../middleware');
    const request = new Request('http://localhost:3100/api/admin/test');

    const result = await requirePermissionMiddleware(request as never, 'manage_users' as never);

    expect(result).toBeNull();
  });
});

describe('apiMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no options specified', async () => {
    const { apiMiddleware } = await import('../middleware');
    const request = new Request('http://localhost:3100/api/test', {
      headers: { 'x-forwarded-for': `api-mw-${Date.now()}` },
    });

    const result = await apiMiddleware(request as never, {});
    expect(result).toBeNull();
  });

  it('returns 401 for requirePermission when not authenticated', async () => {
    // Session is not logged in (default mock)
    vi.mocked(getIronSession).mockResolvedValue({
      isLoggedIn: false,
      save: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { apiMiddleware } = await import('../middleware');
    const request = new Request('http://localhost:3100/api/admin/test', {
      headers: { 'x-forwarded-for': `api-mw-perm-${Date.now()}` },
    });

    const result = await apiMiddleware(request as never, {
      requirePermission: 'manage_users' as never,
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('chains auth + admin + permission checks when all pass', async () => {
    // Mock session as logged-in user with an address
    vi.mocked(getIronSession).mockResolvedValue({
      isLoggedIn: true,
      address: '0x1234567890123456789012345678901234567890',
      save: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // Mock isAdmin to return true (admin check passes)
    vi.mocked(isAdmin).mockResolvedValue(true);
    // Mock hasPermission to return true (permission check passes)
    vi.mocked(hasPermission).mockResolvedValue(true);

    const { apiMiddleware } = await import('../middleware');
    const request = new Request('http://localhost:3100/api/admin/test', {
      headers: { 'x-forwarded-for': `api-mw-chain-${Date.now()}` },
    });

    const result = await apiMiddleware(request as never, {
      requirePermission: 'manage_users' as never,
    });

    // All checks pass, so apiMiddleware should return null (continue)
    expect(result).toBeNull();
  });
});
