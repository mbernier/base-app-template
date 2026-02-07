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
