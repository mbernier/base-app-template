/**
 * Unit tests for lib/admin-cache.ts
 *
 * Pure unit tests -- no database or external dependencies needed.
 * Tests the LRU cache behavior including TTL, eviction, and prefix invalidation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LRUCache } from '@/lib/admin-cache';

describe('LRUCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic operations', () => {
    it('stores and retrieves a value', () => {
      const cache = new LRUCache<string>();
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('returns undefined for missing key', () => {
      const cache = new LRUCache<string>();
      expect(cache.get('missing')).toBeUndefined();
    });

    it('overwrites existing key', () => {
      const cache = new LRUCache<string>();
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
      expect(cache.size).toBe(1);
    });

    it('deletes a key', () => {
      const cache = new LRUCache<string>();
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('delete returns false for missing key', () => {
      const cache = new LRUCache<string>();
      expect(cache.delete('missing')).toBe(false);
    });

    it('clears all entries', () => {
      const cache = new LRUCache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('TTL expiration', () => {
    it('returns undefined after TTL expires', () => {
      const cache = new LRUCache<string>(100, 5000); // 5s TTL

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(5001);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('returns value before TTL expires', () => {
      const cache = new LRUCache<string>(100, 5000);

      cache.set('key1', 'value1');
      vi.advanceTimersByTime(4999);
      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('LRU eviction', () => {
    it('evicts the least recently used entry when at capacity', () => {
      const cache = new LRUCache<string>(3, 60_000);

      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      // Adding a 4th should evict 'a' (oldest)
      cache.set('d', '4');

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('2');
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
      expect(cache.size).toBe(3);
    });

    it('accessing a key makes it most recently used', () => {
      const cache = new LRUCache<string>(3, 60_000);

      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      // Access 'a' to make it most recently used
      cache.get('a');

      // Adding 'd' should now evict 'b' (the oldest untouched)
      cache.set('d', '4');

      expect(cache.get('a')).toBe('1');
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
    });
  });

  describe('invalidatePrefix', () => {
    it('removes all entries with matching prefix', () => {
      const cache = new LRUCache<string>();

      cache.set('role:0xabc', 'admin');
      cache.set('role:0xdef', 'user');
      cache.set('perms:0xabc', 'manage_users');

      cache.invalidatePrefix('role:');

      expect(cache.get('role:0xabc')).toBeUndefined();
      expect(cache.get('role:0xdef')).toBeUndefined();
      expect(cache.get('perms:0xabc')).toBe('manage_users');
    });

    it('does nothing when no keys match prefix', () => {
      const cache = new LRUCache<string>();
      cache.set('key1', 'value1');
      cache.invalidatePrefix('nomatch:');
      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('size tracking', () => {
    it('tracks size correctly through operations', () => {
      const cache = new LRUCache<string>();

      expect(cache.size).toBe(0);

      cache.set('a', '1');
      expect(cache.size).toBe(1);

      cache.set('b', '2');
      expect(cache.size).toBe(2);

      cache.delete('a');
      expect(cache.size).toBe(1);

      cache.clear();
      expect(cache.size).toBe(0);
    });
  });
});
