/**
 * Distributed rate limiting with provider auto-detection.
 *
 * Providers (checked in priority order):
 * 1. REDIS_URL → Standard Redis (TCP) via ioredis — Railway, Redis Cloud, self-hosted
 * 2. UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN → Upstash (HTTP) — Vercel serverless
 * 3. Neither → In-memory fallback (dev / single-instance only)
 */

import { rateLimit as config } from './config';

// ── Types ──────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number; // epoch ms when window resets
}

// ── In-memory provider (default fallback) ──────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function inMemoryRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetMs: now + windowMs,
    };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, limit: maxRequests, remaining: 0, resetMs: record.resetTime };
  }

  record.count++;
  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - record.count,
    resetMs: record.resetTime,
  };
}

// ── Provider detection & lazy init ─────────────────────────────────────

type Provider = 'redis' | 'upstash' | 'memory';

export function detectProvider(): Provider {
  if (config.redisUrl) return 'redis';
  if (config.upstashUrl && config.upstashToken) return 'upstash';
  return 'memory';
}

// Lazy-initialized clients (one per process lifetime)
let redisClient: import('ioredis').default | null = null;
let upstashLimiter: import('@upstash/ratelimit').Ratelimit | null = null;

// ── Standard Redis provider (Railway, etc.) ────────────────────────────
// Uses INCR + PEXPIRE in a Lua script for atomic fixed-window counting.

const REDIS_RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local max = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local current = tonumber(redis.call('INCR', key))
if current == 1 then
  redis.call('PEXPIRE', key, windowMs)
end
local ttl = redis.call('PTTL', key)
if ttl < 0 then ttl = windowMs end
return {current, ttl}
`;

async function getRedisClient(): Promise<import('ioredis').default> {
  if (!redisClient) {
    const { default: Redis } = await import('ioredis');
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    await redisClient.connect();
  }
  return redisClient;
}

async function redisRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitResult> {
  const redis = await getRedisClient();
  const key = `rl:${identifier}`;
  const result = (await redis.eval(
    REDIS_RATE_LIMIT_SCRIPT,
    1,
    key,
    String(maxRequests),
    String(windowMs)
  )) as [number, number];

  const current = Number(result[0]);
  const ttl = Number(result[1]);
  const remaining = Math.max(0, maxRequests - current);
  const resetMs = Date.now() + ttl;

  return {
    allowed: current <= maxRequests,
    limit: maxRequests,
    remaining,
    resetMs,
  };
}

// ── Upstash provider ───────────────────────────────────────────────────

async function getUpstashLimiter(): Promise<import('@upstash/ratelimit').Ratelimit> {
  if (!upstashLimiter) {
    const { Redis } = await import('@upstash/redis');
    const { Ratelimit } = await import('@upstash/ratelimit');
    upstashLimiter = new Ratelimit({
      redis: new Redis({ url: config.upstashUrl, token: config.upstashToken }),
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
      analytics: true,
    });
  }
  return upstashLimiter;
}

async function upstashRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = await getUpstashLimiter();
  const { success, limit, remaining, reset, pending } = await limiter.limit(identifier);
  // Fire-and-forget analytics/background work — prevent unhandled rejection
  void pending.catch(() => {});
  return { allowed: success, limit, remaining, resetMs: reset };
}

// ── Public API ─────────────────────────────────────────────────────────

export async function rateLimit(
  identifier: string,
  windowMs: number = config.windowMs,
  maxRequests: number = config.maxRequests
): Promise<RateLimitResult> {
  const provider = detectProvider();

  switch (provider) {
    case 'redis':
      return redisRateLimit(identifier, windowMs, maxRequests);
    case 'upstash':
      return upstashRateLimit(identifier);
    case 'memory':
    default:
      return inMemoryRateLimit(identifier, windowMs, maxRequests);
  }
}

/** Cleanup function for graceful shutdown (standard Redis only) */
export async function closeRateLimitConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Exported for testing only
export { inMemoryRateLimit as _inMemoryRateLimit, rateLimitMap as _rateLimitMap };
