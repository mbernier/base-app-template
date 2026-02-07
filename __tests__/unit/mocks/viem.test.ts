/**
 * Mock contract validation: viem
 *
 * Verifies that every export in our mock file exists in the real
 * viem module and has the same typeof (function).
 * Does NOT call real functions -- they require blockchain connectivity.
 */
import { describe, it, expect, vi } from 'vitest';

import * as mockModule from '../../__mocks__/viem';

describe('viem mock contract validation', () => {
  it('mock exports match real module exports', async () => {
    const realModule = await vi.importActual<Record<string, unknown>>('viem');

    const expectedExports = ['createPublicClient', 'http'];

    for (const key of expectedExports) {
      // The mock must expose this key
      expect(mockModule).toHaveProperty(key);
      // The real module must also expose this key
      expect(realModule).toHaveProperty(key);
      // Both should be functions
      expect(typeof (mockModule as Record<string, unknown>)[key]).toBe('function');
      expect(typeof realModule[key]).toBe('function');
    }
  });

  it('all mock keys exist in the real module', async () => {
    const realModule = await vi.importActual<Record<string, unknown>>('viem');

    for (const key of Object.keys(mockModule)) {
      if (key === 'default' || key === '__esModule') continue;
      expect(realModule).toHaveProperty(key);
      expect(typeof realModule[key]).toBe(typeof (mockModule as Record<string, unknown>)[key]);
    }
  });

  it('createPublicClient() mock returns well-shaped data', () => {
    const result = mockModule.createPublicClient();

    expect(result).toHaveProperty('readContract');
    expect(result).toHaveProperty('getBlock');
    expect(result).toHaveProperty('getTransaction');
    expect(result).toHaveProperty('chain');
    expect(typeof result.readContract).toBe('function');
    expect(typeof result.getBlock).toBe('function');
    expect(typeof result.getTransaction).toBe('function');
    expect(result.chain).toHaveProperty('id');
    expect(result.chain).toHaveProperty('name');
    expect(typeof result.chain.id).toBe('number');
  });

  it('http() mock returns well-shaped data', () => {
    const result = mockModule.http();

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('url');
    expect(result.type).toBe('http');
    expect(typeof result.url).toBe('string');
  });
});
