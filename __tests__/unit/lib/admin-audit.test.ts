/**
 * Integration tests for lib/admin-audit.ts
 *
 * These tests use a REAL Supabase database -- no mocking of the DB layer.
 * Tests require migration 004 to be applied (admin_audit_log table).
 *
 * Skipped if no database is available.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createUntypedServerClient } from '@/lib/db';
import { logAdminAudit, withAuditLog, getAuditLog, getAuditEntry } from '@/lib/admin-audit';

// Check DB availability synchronously at module level via top-level await
let dbAvailable = false;
try {
  const supabase = createUntypedServerClient();
  const { error } = await supabase.from('admin_audit_log').select('id').limit(0);
  dbAvailable = !error;
} catch {
  dbAvailable = false;
}

const TEST_PREFIX = `test${Date.now()}`;
const TEST_ADDRESS = `0x${TEST_PREFIX}audit0000000000000000000000`.slice(0, 42);

let testAccountId: string;

describe('admin-audit', () => {
  beforeAll(async () => {
    if (!dbAvailable) return;

    try {
      const supabase = createUntypedServerClient();

      // Create test account
      const { data, error } = await supabase
        .from('accounts')
        .upsert(
          { address: TEST_ADDRESS.toLowerCase(), role: 'admin', chain_id: 8453 },
          { onConflict: 'address' }
        )
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create test account: ${error.message}`);
      }

      testAccountId = data.id;
    } catch {
      console.warn('[admin-audit tests] Database not available, skipping.');
    }
  });

  afterAll(async () => {
    if (!dbAvailable) return;

    const supabase = createUntypedServerClient();

    // Clean up audit entries
    if (testAccountId) {
      await supabase.from('admin_audit_log').delete().eq('account_id', testAccountId);
    }

    // Clean up account
    await supabase.from('accounts').delete().eq('address', TEST_ADDRESS.toLowerCase());
  });

  describe('logAdminAudit', () => {
    it.skipIf(!dbAvailable)('writes an audit entry', async () => {
      await logAdminAudit({
        accountId: testAccountId,
        action: 'setting.update',
        resourceType: 'setting',
        resourceId: 'test-setting',
        previousValue: { value: 'old' },
        newValue: { value: 'new' },
        success: true,
      });

      // Verify entry was created
      const entries = await getAuditLog({
        accountId: testAccountId,
        action: 'setting.update',
        limit: 1,
      });

      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('setting.update');
      expect(entries[0].resourceType).toBe('setting');
      expect(entries[0].previousValue).toEqual({ value: 'old' });
      expect(entries[0].newValue).toEqual({ value: 'new' });
      expect(entries[0].success).toBe(true);
    });

    it.skipIf(!dbAvailable)('writes an error audit entry', async () => {
      await logAdminAudit({
        accountId: testAccountId,
        action: 'role.update',
        resourceType: 'user',
        success: false,
        errorMessage: 'Test error message',
      });

      const entries = await getAuditLog({
        accountId: testAccountId,
        action: 'role.update',
        limit: 1,
      });

      expect(entries.length).toBe(1);
      expect(entries[0].success).toBe(false);
      expect(entries[0].errorMessage).toBe('Test error message');
    });
  });

  describe('withAuditLog', () => {
    it.skipIf(!dbAvailable)('logs success when operation succeeds', async () => {
      const result = await withAuditLog(
        {
          accountId: testAccountId,
          action: 'collection.create',
          resourceType: 'collection',
          resourceId: 'test-collection',
        },
        async () => ({ name: 'old-collection' }),
        async () => ({ name: 'new-collection', id: 'test-123' })
      );

      expect(result).toEqual({ name: 'new-collection', id: 'test-123' });

      const entries = await getAuditLog({
        accountId: testAccountId,
        action: 'collection.create',
        limit: 1,
      });

      expect(entries[0].success).toBe(true);
      expect(entries[0].previousValue).toEqual({ name: 'old-collection' });
      expect(entries[0].newValue).toEqual({ name: 'new-collection', id: 'test-123' });
    });

    it.skipIf(!dbAvailable)('logs failure when operation throws', async () => {
      await expect(
        withAuditLog(
          {
            accountId: testAccountId,
            action: 'collection.delete',
            resourceType: 'collection',
            resourceId: 'test-fail',
          },
          undefined,
          async () => {
            throw new Error('Intentional test failure');
          }
        )
      ).rejects.toThrow('Intentional test failure');

      const entries = await getAuditLog({
        accountId: testAccountId,
        action: 'collection.delete',
        limit: 1,
      });

      expect(entries[0].success).toBe(false);
      expect(entries[0].errorMessage).toBe('Intentional test failure');
    });
  });

  describe('getAuditLog', () => {
    it.skipIf(!dbAvailable)('filters by resourceType', async () => {
      const entries = await getAuditLog({
        accountId: testAccountId,
        resourceType: 'setting',
      });

      expect(entries.length).toBeGreaterThanOrEqual(1);
      entries.forEach((e) => expect(e.resourceType).toBe('setting'));
    });

    it.skipIf(!dbAvailable)('respects limit', async () => {
      const entries = await getAuditLog({
        accountId: testAccountId,
        limit: 1,
      });

      expect(entries.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getAuditEntry', () => {
    it.skipIf(!dbAvailable)('returns an entry by ID', async () => {
      const entries = await getAuditLog({
        accountId: testAccountId,
        limit: 1,
      });

      if (entries.length === 0) return;

      const entry = await getAuditEntry(entries[0].id);
      expect(entry).not.toBeNull();
      expect(entry!.id).toBe(entries[0].id);
    });

    it.skipIf(!dbAvailable)('returns null for non-existent ID', async () => {
      const entry = await getAuditEntry('00000000-0000-0000-0000-000000000000');
      expect(entry).toBeNull();
    });
  });
});
