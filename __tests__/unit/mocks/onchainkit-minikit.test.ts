/**
 * Mock contract validation: @coinbase/onchainkit/minikit
 *
 * Verifies that every export in our mock file exists in the real
 * @coinbase/onchainkit/minikit module and has the same typeof (function).
 * Does NOT call real functions -- they require a MiniKit runtime environment.
 */
import { describe, it, expect, vi } from 'vitest';

import * as mockModule from '../../__mocks__/onchainkit-minikit';

describe('@coinbase/onchainkit/minikit mock contract validation', () => {
  it('mock exports match real module exports', async () => {
    const realModule = await vi.importActual<Record<string, unknown>>(
      '@coinbase/onchainkit/minikit'
    );

    const expectedExports = ['useMiniKit'];

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
      '@coinbase/onchainkit/minikit'
    );

    for (const key of Object.keys(mockModule)) {
      if (key === 'default' || key === '__esModule') continue;
      expect(realModule).toHaveProperty(key);
      expect(typeof realModule[key]).toBe(typeof (mockModule as Record<string, unknown>)[key]);
    }
  });

  it('useMiniKit() mock returns well-shaped data', () => {
    const result = mockModule.useMiniKit();

    expect(result).toHaveProperty('context');
    expect(result).toHaveProperty('isMiniAppReady');
    expect(result).toHaveProperty('setMiniAppReady');
    expect(result.context).toBeNull();
    expect(typeof result.isMiniAppReady).toBe('boolean');
    expect(typeof result.setMiniAppReady).toBe('function');
  });
});
