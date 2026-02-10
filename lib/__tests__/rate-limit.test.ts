import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock config ────────────────────────────────────────────────────────
// Start with no Redis config (in-memory mode)
const mockConfig = {
  windowMs: 60000,
  maxRequests: 5,
  redisUrl: '',
  upstashUrl: '',
  upstashToken: '',
};

vi.mock('../config', () => ({
  rateLimit: mockConfig,
}));

// ── Mock ioredis ───────────────────────────────────────────────────────
const mockEval = vi.fn();
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockQuit = vi.fn().mockResolvedValue('OK');

// Must use regular function (not arrow) for constructor mocks
const MockRedisConstructor = vi.fn(function () {
  return { eval: mockEval, connect: mockConnect, quit: mockQuit };
});

vi.mock('ioredis', () => ({
  default: MockRedisConstructor,
}));

// ── Mock @upstash/redis ────────────────────────────────────────────────
const MockUpstashRedis = vi.fn(function () {
  return {};
});
vi.mock('@upstash/redis', () => ({
  Redis: MockUpstashRedis,
}));

// ── Mock @upstash/ratelimit ────────────────────────────────────────────
const mockLimit = vi.fn();
const MockRatelimit = Object.assign(
  vi.fn(function () {
    return { limit: mockLimit };
  }),
  { slidingWindow: vi.fn().mockReturnValue('sliding-window-config') }
);

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: MockRatelimit,
}));

// ── Contract validation tests ──────────────────────────────────────────

describe('config mock contract validation', () => {
  it('has all required rateLimit config keys', async () => {
    const { rateLimit } = await import('../config');
    expect(rateLimit).toHaveProperty('windowMs');
    expect(rateLimit).toHaveProperty('maxRequests');
    expect(rateLimit).toHaveProperty('redisUrl');
    expect(rateLimit).toHaveProperty('upstashUrl');
    expect(rateLimit).toHaveProperty('upstashToken');
    expect(typeof rateLimit.windowMs).toBe('number');
    expect(typeof rateLimit.maxRequests).toBe('number');
    expect(typeof rateLimit.redisUrl).toBe('string');
    expect(typeof rateLimit.upstashUrl).toBe('string');
    expect(typeof rateLimit.upstashToken).toBe('string');
  });
});

describe('ioredis mock contract validation', () => {
  it('mock Redis constructor accepts (url, options) like real ioredis', () => {
    // Call with args to validate the constructor signature matches real ioredis
    const create = MockRedisConstructor as unknown as (
      url: string,
      opts: Record<string, unknown>
    ) => { eval: typeof mockEval; connect: typeof mockConnect; quit: typeof mockQuit };
    const instance = create('redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    expect(instance).toHaveProperty('eval');
    expect(instance).toHaveProperty('connect');
    expect(instance).toHaveProperty('quit');
    expect(typeof instance.eval).toBe('function');
    expect(typeof instance.connect).toBe('function');
    expect(typeof instance.quit).toBe('function');
  });

  it('mock eval accepts (script, numkeys, key, ...args) like real ioredis', async () => {
    mockEval.mockResolvedValueOnce([1, 60000]);
    const instance = (MockRedisConstructor as unknown as () => { eval: typeof mockEval })();
    const result = await instance.eval('lua script', 1, 'key', '100', '60000');
    expect(result).toEqual([1, 60000]);
    expect(mockEval).toHaveBeenCalledWith('lua script', 1, 'key', '100', '60000');
  });
});

describe('@upstash/ratelimit mock contract validation', () => {
  it('mock Ratelimit.limit() returns expected shape', async () => {
    const mockResponse = {
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
    };
    mockLimit.mockResolvedValueOnce(mockResponse);

    const create = MockRatelimit as unknown as (config: Record<string, unknown>) => {
      limit: typeof mockLimit;
    };
    const instance = create({});
    const result = await instance.limit('test-id');

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('limit');
    expect(result).toHaveProperty('remaining');
    expect(result).toHaveProperty('reset');
    expect(result).toHaveProperty('pending');
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.limit).toBe('number');
    expect(typeof result.remaining).toBe('number');
    expect(typeof result.reset).toBe('number');
    expect(result.pending).toBeInstanceOf(Promise);
  });

  it('mock Ratelimit has slidingWindow static method', () => {
    expect(typeof MockRatelimit.slidingWindow).toBe('function');
    const result = MockRatelimit.slidingWindow(100, '60000 ms');
    expect(result).toBe('sliding-window-config');
  });
});

// ── Provider detection tests ───────────────────────────────────────────

describe('detectProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConfig.redisUrl = '';
    mockConfig.upstashUrl = '';
    mockConfig.upstashToken = '';
  });

  it('returns "memory" when no Redis config is set', async () => {
    const { detectProvider } = await import('../rate-limit');
    expect(detectProvider()).toBe('memory');
  });

  it('returns "redis" when REDIS_URL is set', async () => {
    mockConfig.redisUrl = 'redis://localhost:6379';
    const { detectProvider } = await import('../rate-limit');
    expect(detectProvider()).toBe('redis');
  });

  it('returns "upstash" when Upstash vars are set', async () => {
    mockConfig.upstashUrl = 'https://my-instance.upstash.io';
    mockConfig.upstashToken = 'AXxxxxxxxxx';
    const { detectProvider } = await import('../rate-limit');
    expect(detectProvider()).toBe('upstash');
  });

  it('returns "upstash" only when BOTH Upstash vars are set', async () => {
    mockConfig.upstashUrl = 'https://my-instance.upstash.io';
    mockConfig.upstashToken = '';
    const { detectProvider } = await import('../rate-limit');
    expect(detectProvider()).toBe('memory');
  });

  it('REDIS_URL takes priority over Upstash vars when both set', async () => {
    mockConfig.redisUrl = 'redis://localhost:6379';
    mockConfig.upstashUrl = 'https://my-instance.upstash.io';
    mockConfig.upstashToken = 'AXxxxxxxxxx';
    const { detectProvider } = await import('../rate-limit');
    expect(detectProvider()).toBe('redis');
  });
});

// ── In-memory provider tests ───────────────────────────────────────────

describe('in-memory rate limiting', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockConfig.redisUrl = '';
    mockConfig.upstashUrl = '';
    mockConfig.upstashToken = '';
  });

  it('allows requests within limit', async () => {
    const { rateLimit } = await import('../rate-limit');
    const id = `test-allow-${Date.now()}`;

    for (let i = 0; i < 5; i++) {
      const result = await rateLimit(id, 60000, 5);
      expect(result.allowed).toBe(true);
    }
  });

  it('rejects requests over limit', async () => {
    const { rateLimit } = await import('../rate-limit');
    const id = `test-block-${Date.now()}`;

    // Use up all allowed requests
    for (let i = 0; i < 5; i++) {
      await rateLimit(id, 60000, 5);
    }

    // Next request should be blocked
    const result = await rateLimit(id, 60000, 5);
    expect(result.allowed).toBe(false);
  });

  it('resets after window expires', async () => {
    const { _inMemoryRateLimit, _rateLimitMap } = await import('../rate-limit');

    const id = `test-expire-${Date.now()}`;

    // Set a record that's already expired
    _rateLimitMap.set(id, { count: 100, resetTime: Date.now() - 1 });

    const result = _inMemoryRateLimit(id, 60000, 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('isolates different identifiers', async () => {
    const { rateLimit } = await import('../rate-limit');
    const ts = Date.now();

    // Exhaust limit for identifier A
    for (let i = 0; i < 5; i++) {
      await rateLimit(`id-a-${ts}`, 60000, 5);
    }
    const resultA = await rateLimit(`id-a-${ts}`, 60000, 5);
    expect(resultA.allowed).toBe(false);

    // Identifier B should still be allowed
    const resultB = await rateLimit(`id-b-${ts}`, 60000, 5);
    expect(resultB.allowed).toBe(true);
  });

  it('returns correct remaining count', async () => {
    const { rateLimit } = await import('../rate-limit');
    const id = `test-remaining-${Date.now()}`;

    const r1 = await rateLimit(id, 60000, 5);
    expect(r1.remaining).toBe(4);
    expect(r1.limit).toBe(5);

    const r2 = await rateLimit(id, 60000, 5);
    expect(r2.remaining).toBe(3);

    const r3 = await rateLimit(id, 60000, 5);
    expect(r3.remaining).toBe(2);

    const r4 = await rateLimit(id, 60000, 5);
    expect(r4.remaining).toBe(1);

    const r5 = await rateLimit(id, 60000, 5);
    expect(r5.remaining).toBe(0);
    expect(r5.allowed).toBe(true); // 5th request is still allowed

    const r6 = await rateLimit(id, 60000, 5);
    expect(r6.remaining).toBe(0);
    expect(r6.allowed).toBe(false); // 6th is blocked
  });

  it('returns resetMs in the future', async () => {
    const { rateLimit } = await import('../rate-limit');
    const id = `test-resetms-${Date.now()}`;
    const before = Date.now();

    const result = await rateLimit(id, 60000, 5);
    expect(result.resetMs).toBeGreaterThan(before);
    expect(result.resetMs).toBeLessThanOrEqual(before + 60000 + 10); // small tolerance
  });

  it('uses default config values when no args provided', async () => {
    const { rateLimit } = await import('../rate-limit');
    const id = `test-defaults-${Date.now()}`;

    // mockConfig has windowMs: 60000, maxRequests: 5
    const result = await rateLimit(id);
    expect(result.limit).toBe(5);
    expect(result.allowed).toBe(true);
  });
});

// ── Standard Redis provider tests ──────────────────────────────────────

describe('standard Redis rate limiting', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConfig.redisUrl = 'redis://localhost:6379';
    mockConfig.upstashUrl = '';
    mockConfig.upstashToken = '';
    MockRedisConstructor.mockClear();
    mockEval.mockReset();
    mockConnect.mockReset().mockResolvedValue(undefined);
    mockQuit.mockReset().mockResolvedValue('OK');
  });

  it('calls Lua script with correct args', async () => {
    mockEval.mockResolvedValueOnce([1, 60000]);
    const { rateLimit } = await import('../rate-limit');

    await rateLimit('test-user', 30000, 10);

    expect(mockEval).toHaveBeenCalledOnce();
    const args = mockEval.mock.calls[0];
    // args: (script, numkeys, key, maxRequests, windowMs)
    expect(args[1]).toBe(1); // numkeys
    expect(args[2]).toBe('rl:test-user'); // key with prefix
    expect(args[3]).toBe('10'); // maxRequests as string
    expect(args[4]).toBe('30000'); // windowMs as string
    expect(typeof args[0]).toBe('string'); // Lua script
  });

  it('returns correct RateLimitResult when allowed', async () => {
    mockEval.mockResolvedValueOnce([3, 45000]); // current=3, ttl=45000
    const { rateLimit } = await import('../rate-limit');

    const result = await rateLimit('user-1', 60000, 10);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(7); // 10 - 3
    expect(result.resetMs).toBeGreaterThan(Date.now());
  });

  it('returns correct RateLimitResult when blocked', async () => {
    mockEval.mockResolvedValueOnce([11, 30000]); // current=11 > max=10
    const { rateLimit } = await import('../rate-limit');

    const result = await rateLimit('user-1', 60000, 10);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('lazy-initializes connection on first call', async () => {
    mockEval.mockResolvedValue([1, 60000]);
    const { rateLimit } = await import('../rate-limit');

    expect(MockRedisConstructor).not.toHaveBeenCalled();
    expect(mockConnect).not.toHaveBeenCalled();

    await rateLimit('test-lazy');

    expect(MockRedisConstructor).toHaveBeenCalledOnce();
    expect(mockConnect).toHaveBeenCalledOnce();

    // Second call should reuse existing connection
    await rateLimit('test-lazy-2');
    expect(MockRedisConstructor).toHaveBeenCalledOnce(); // still 1
    expect(mockConnect).toHaveBeenCalledOnce(); // still 1
  });

  it('passes connection options to ioredis constructor', async () => {
    mockEval.mockResolvedValueOnce([1, 60000]);
    const { rateLimit } = await import('../rate-limit');

    await rateLimit('test-opts');

    expect(MockRedisConstructor).toHaveBeenCalledWith('redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
  });
});

// ── Upstash provider tests ─────────────────────────────────────────────

describe('Upstash rate limiting', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConfig.redisUrl = '';
    mockConfig.upstashUrl = 'https://test.upstash.io';
    mockConfig.upstashToken = 'test-token';
    MockUpstashRedis.mockClear();
    MockRatelimit.mockClear();
    mockLimit.mockReset();
  });

  it('calls limiter.limit() with identifier', async () => {
    mockLimit.mockResolvedValueOnce({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
    });
    const { rateLimit } = await import('../rate-limit');

    await rateLimit('user-abc');

    expect(mockLimit).toHaveBeenCalledWith('user-abc');
  });

  it('returns correct RateLimitResult shape', async () => {
    const resetTime = Date.now() + 60000;
    mockLimit.mockResolvedValueOnce({
      success: true,
      limit: 100,
      remaining: 99,
      reset: resetTime,
      pending: Promise.resolve(),
    });
    const { rateLimit } = await import('../rate-limit');

    const result = await rateLimit('user-shape');

    expect(result).toEqual({
      allowed: true,
      limit: 100,
      remaining: 99,
      resetMs: resetTime,
    });
  });

  it('maps success=false to allowed=false', async () => {
    mockLimit.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
    });
    const { rateLimit } = await import('../rate-limit');

    const result = await rateLimit('user-blocked');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('lazy-initializes on first call', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
    });
    const { rateLimit } = await import('../rate-limit');

    expect(MockRatelimit).not.toHaveBeenCalled();

    await rateLimit('test-lazy');
    expect(MockRatelimit).toHaveBeenCalledOnce();

    // Second call reuses instance
    await rateLimit('test-lazy-2');
    expect(MockRatelimit).toHaveBeenCalledOnce();
  });

  it('initializes Upstash Redis with correct credentials', async () => {
    mockLimit.mockResolvedValueOnce({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
    });
    const { rateLimit } = await import('../rate-limit');

    await rateLimit('test-creds');

    expect(MockUpstashRedis).toHaveBeenCalledWith({
      url: 'https://test.upstash.io',
      token: 'test-token',
    });
  });

  it('handles pending promise rejection gracefully', async () => {
    // Create a deferred rejection that won't trigger unhandled rejection
    // The rate-limit module attaches .catch() before the rejection propagates
    const pendingPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('analytics failed')), 0);
    });
    // Prevent test runner from seeing this as unhandled
    pendingPromise.catch(() => {});

    mockLimit.mockResolvedValueOnce({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60000,
      pending: pendingPromise,
    });
    const { rateLimit } = await import('../rate-limit');

    // Should not throw even though pending rejects
    const result = await rateLimit('test-pending-reject');
    expect(result.allowed).toBe(true);
  });
});

// ── Cleanup tests ──────────────────────────────────────────────────────

describe('closeRateLimitConnection', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConfig.redisUrl = 'redis://localhost:6379';
    mockConfig.upstashUrl = '';
    mockConfig.upstashToken = '';
    MockRedisConstructor.mockClear();
    mockEval.mockReset().mockResolvedValue([1, 60000]);
    mockConnect.mockReset().mockResolvedValue(undefined);
    mockQuit.mockReset().mockResolvedValue('OK');
  });

  it('calls redis.quit() when connection exists', async () => {
    const { rateLimit, closeRateLimitConnection } = await import('../rate-limit');

    // Establish connection by making a rate limit call
    await rateLimit('test-cleanup');

    await closeRateLimitConnection();
    expect(mockQuit).toHaveBeenCalledOnce();
  });

  it('does nothing when no connection exists', async () => {
    mockConfig.redisUrl = '';
    const { closeRateLimitConnection } = await import('../rate-limit');

    // Should not throw
    await closeRateLimitConnection();
    expect(mockQuit).not.toHaveBeenCalled();
  });
});
