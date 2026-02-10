/**
 * Integration tests for GET /api/health
 *
 * Tests the health check endpoint with real Supabase DB connectivity.
 * Mocks next/headers for safety (audit module may reference it).
 */
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock next/headers for safety (other modules may import it transitively)
// ---------------------------------------------------------------------------
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
  headers: vi.fn(() =>
    Promise.resolve(
      new Map([
        ['x-forwarded-for', 'test-127.0.0.1'],
        ['x-real-ip', '127.0.0.1'],
      ])
    )
  ),
}));

// Import route handler AFTER mocks are set up
import { GET } from '@/app/api/health/route';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('GET /api/health', () => {
  it('returns 200', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
  });

  it('response has status, timestamp, and services.database fields', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('services');
    expect(body.services).toHaveProperty('database');
    expect(body.services.database).toHaveProperty('status');
  });

  it('database status is connected when Supabase is running', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe('healthy');
    expect(body.services.database.status).toBe('connected');
    expect(typeof body.services.database.latencyMs).toBe('number');
    expect(body.services.database.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
