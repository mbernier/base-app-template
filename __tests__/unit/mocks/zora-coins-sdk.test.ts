/**
 * Mock contract validation: @zoralabs/coins-sdk
 *
 * Verifies that every export in our mock file exists in the real
 * @zoralabs/coins-sdk module and has the same typeof (function).
 * Does NOT call real functions -- they require blockchain connectivity.
 */
import { describe, it, expect, vi } from 'vitest';

import * as mockModule from '../../__mocks__/@zoralabs/coins-sdk';

describe('@zoralabs/coins-sdk mock contract validation', () => {
  it('mock exports match real module exports', async () => {
    const realModule = await vi.importActual<Record<string, unknown>>(
      '@zoralabs/coins-sdk',
    );

    const expectedExports = ['createCoinCall', 'createTradeCall', 'getCoin'];

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
    const realModule = await vi.importActual<Record<string, unknown>>(
      '@zoralabs/coins-sdk',
    );

    for (const key of Object.keys(mockModule)) {
      if (key === 'default' || key === '__esModule') continue;
      expect(realModule).toHaveProperty(key);
      expect(typeof realModule[key]).toBe(typeof (mockModule as Record<string, unknown>)[key]);
    }
  });

  it('createCoinCall() mock returns well-shaped data', () => {
    const result = mockModule.createCoinCall();

    expect(result).toHaveProperty('calls');
    expect(Array.isArray(result.calls)).toBe(true);
    expect(result.calls.length).toBeGreaterThan(0);

    const call = result.calls[0];
    expect(call).toHaveProperty('to');
    expect(call).toHaveProperty('data');
    expect(typeof call.to).toBe('string');
    expect(typeof call.data).toBe('string');
  });

  it('createTradeCall() mock returns well-shaped data', async () => {
    const result = await mockModule.createTradeCall();

    expect(result).toHaveProperty('to');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('value');
    expect(typeof result.to).toBe('string');
    expect(typeof result.data).toBe('string');
    expect(typeof result.value).toBe('bigint');
  });

  it('getCoin() mock returns well-shaped data', async () => {
    const result = await mockModule.getCoin();

    expect(result).toHaveProperty('data');
    expect(result.data).toHaveProperty('zora20Token');

    const token = result.data.zora20Token;
    expect(token).toHaveProperty('name');
    expect(token).toHaveProperty('description');
    expect(token).toHaveProperty('symbol');
    expect(token).toHaveProperty('totalSupply');
    expect(token).toHaveProperty('marketCap');
    expect(typeof token.name).toBe('string');
    expect(typeof token.symbol).toBe('string');
  });
});
