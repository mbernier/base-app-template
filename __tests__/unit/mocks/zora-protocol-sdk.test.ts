/**
 * Mock contract validation: @zoralabs/protocol-sdk
 *
 * Verifies that every export in our mock file exists in the real
 * @zoralabs/protocol-sdk module and has the same typeof (function).
 * Does NOT call real functions -- they require blockchain connectivity.
 */
import { describe, it, expect, vi } from 'vitest';

import * as mockModule from '../../__mocks__/@zoralabs/protocol-sdk';

describe('@zoralabs/protocol-sdk mock contract validation', () => {
  it('mock exports match real module exports', async () => {
    const realModule = await vi.importActual<Record<string, unknown>>(
      '@zoralabs/protocol-sdk',
    );

    const expectedExports = ['mint', 'getToken', 'create1155'];

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
      '@zoralabs/protocol-sdk',
    );

    for (const key of Object.keys(mockModule)) {
      if (key === 'default' || key === '__esModule') continue;
      expect(realModule).toHaveProperty(key);
      expect(typeof realModule[key]).toBe(typeof (mockModule as Record<string, unknown>)[key]);
    }
  });

  it('mint() mock returns well-shaped data', async () => {
    const result = await mockModule.mint();

    expect(result).toHaveProperty('parameters');
    expect(result.parameters).toHaveProperty('address');
    expect(result.parameters).toHaveProperty('abi');
    expect(result.parameters).toHaveProperty('functionName');
    expect(result.parameters).toHaveProperty('args');
    expect(typeof result.parameters.address).toBe('string');
    expect(typeof result.parameters.functionName).toBe('string');
    expect(Array.isArray(result.parameters.abi)).toBe(true);
    expect(Array.isArray(result.parameters.args)).toBe(true);
  });

  it('getToken() mock returns well-shaped data', async () => {
    const result = await mockModule.getToken();

    expect(result).toHaveProperty('token');
    expect(result.token).toHaveProperty('tokenURI');
    expect(result.token).toHaveProperty('totalMinted');
    expect(result.token).toHaveProperty('maxSupply');
    expect(result.token).toHaveProperty('contract');
    expect(result.token.contract).toHaveProperty('name');
    expect(result.token.contract).toHaveProperty('symbol');
    expect(typeof result.token.tokenURI).toBe('string');
  });

  it('create1155() mock returns well-shaped data', async () => {
    const result = await mockModule.create1155();

    expect(result).toHaveProperty('parameters');
    expect(result.parameters).toHaveProperty('address');
    expect(result.parameters).toHaveProperty('abi');
    expect(result.parameters).toHaveProperty('functionName');
    expect(result.parameters).toHaveProperty('args');
    expect(typeof result.parameters.address).toBe('string');
    expect(typeof result.parameters.functionName).toBe('string');
  });
});
