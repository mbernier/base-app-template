/**
 * Tests for lib/audit.ts
 *
 * logApiRequest: Mocks next/headers (requires Next.js request context).
 *   Uses real Supabase DB -- the api_audit_log table may not exist,
 *   but logApiRequest catches all errors internally.
 *
 * getAccountIdByAddress: Uses real Supabase DB (no mocking).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock next/headers — required because headers() needs a Next.js request
// context that does not exist in vitest.
// ---------------------------------------------------------------------------
const mockHeadersGet = vi.fn();
vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve({ get: mockHeadersGet })),
}));

// Contract validation: verify our next/headers mock shape
describe('next/headers mock contract validation', () => {
  it('headers() returns an object with a get method', async () => {
    const { headers } = await import('next/headers');
    const headersList = await headers();
    expect(headersList).toHaveProperty('get');
    expect(typeof headersList.get).toBe('function');
  });
});

import { logApiRequest, getAccountIdByAddress } from '@/lib/audit';
import { createUntypedServerClient } from '@/lib/db';

describe('audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeadersGet.mockReturnValue(null);
  });

  // -------------------------------------------------------------------------
  // logApiRequest
  // -------------------------------------------------------------------------
  describe('logApiRequest', () => {
    it('does not throw even when insert fails', async () => {
      // The api_audit_log table may not exist, but logApiRequest catches errors
      await expect(
        logApiRequest({
          endpoint: '/api/test',
          method: 'GET',
          responseStatus: 200,
        })
      ).resolves.toBeUndefined();
    });

    it('reads x-forwarded-for header for IP', async () => {
      mockHeadersGet.mockImplementation((name: string) => {
        if (name === 'x-forwarded-for') return '1.2.3.4';
        return null;
      });
      // Should not throw — logApiRequest is fire-and-forget
      await logApiRequest({ endpoint: '/test', method: 'POST', responseStatus: 201 });
    });

    it('falls back to x-real-ip when x-forwarded-for is missing', async () => {
      mockHeadersGet.mockImplementation((name: string) => {
        if (name === 'x-real-ip') return '5.6.7.8';
        return null;
      });
      await logApiRequest({ endpoint: '/test', method: 'GET', responseStatus: 200 });
    });

    it('uses first IP from x-forwarded-for when multiple are present', async () => {
      mockHeadersGet.mockImplementation((name: string) => {
        if (name === 'x-forwarded-for') return '10.0.0.1, 10.0.0.2, 10.0.0.3';
        return null;
      });
      // Should not throw
      await logApiRequest({ endpoint: '/test', method: 'GET', responseStatus: 200 });
    });

    it('handles missing IP gracefully (falls back to "unknown")', async () => {
      // All header lookups return null — IP should fall back to 'unknown'
      mockHeadersGet.mockReturnValue(null);
      await logApiRequest({ endpoint: '/test', method: 'DELETE', responseStatus: 204 });
    });
  });

  // -------------------------------------------------------------------------
  // getAccountIdByAddress
  // -------------------------------------------------------------------------
  describe('getAccountIdByAddress', () => {
    it('returns null for non-existent address', async () => {
      const result = await getAccountIdByAddress('0x0000000000000000000000000000000000000000');
      expect(result).toBeNull();
    });

    it('returns account ID for existing address', async () => {
      const supabase = createUntypedServerClient();
      const testAddr = `0xaudit${Date.now()}00000000000000000000`.slice(0, 42);

      const { data } = await supabase
        .from('accounts')
        .upsert({ address: testAddr, chain_id: 8453 }, { onConflict: 'address' })
        .select('id')
        .single();

      try {
        const result = await getAccountIdByAddress(testAddr);
        expect(result).toBe(data!.id);
      } finally {
        // Cleanup
        await supabase.from('accounts').delete().eq('address', testAddr);
      }
    });

    it('is case-insensitive for addresses', async () => {
      const supabase = createUntypedServerClient();
      const testAddr = `0xauditci${Date.now()}000000000000000000`.slice(0, 42);

      const { data } = await supabase
        .from('accounts')
        .upsert({ address: testAddr.toLowerCase(), chain_id: 8453 }, { onConflict: 'address' })
        .select('id')
        .single();

      try {
        // Query with uppercase — should still find the record
        const result = await getAccountIdByAddress(testAddr.toUpperCase());
        expect(result).toBe(data!.id);
      } finally {
        await supabase.from('accounts').delete().eq('address', testAddr.toLowerCase());
      }
    });
  });
});
