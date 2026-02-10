/**
 * Mock contract validation: wagmi
 *
 * Verifies that every export in our mock file exists in the real
 * wagmi module and has the same typeof (function).
 * Does NOT call real functions -- they require a wagmi provider context.
 */
import { describe, it, expect, vi } from 'vitest';

import * as mockModule from '../../__mocks__/wagmi';

describe('wagmi mock contract validation', () => {
  it('mock exports match real module exports', async () => {
    const realModule = await vi.importActual<Record<string, unknown>>('wagmi');

    const expectedExports = [
      'useWriteContract',
      'useWaitForTransactionReceipt',
      'useAccount',
      'useConnect',
      'useSignMessage',
      'useDisconnect',
      'useReadContract',
    ];

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
    const realModule = await vi.importActual<Record<string, unknown>>('wagmi');

    for (const key of Object.keys(mockModule)) {
      if (key === 'default' || key === '__esModule') continue;
      expect(realModule).toHaveProperty(key);
      expect(typeof realModule[key]).toBe(typeof (mockModule as Record<string, unknown>)[key]);
    }
  });

  it('useWriteContract() mock returns well-shaped data', () => {
    const result = mockModule.useWriteContract();

    expect(result).toHaveProperty('writeContractAsync');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('isPending');
    expect(result).toHaveProperty('isError');
    expect(result).toHaveProperty('isSuccess');
    expect(result).toHaveProperty('reset');
    expect(typeof result.writeContractAsync).toBe('function');
    expect(typeof result.reset).toBe('function');
    expect(typeof result.isPending).toBe('boolean');
  });

  it('useWaitForTransactionReceipt() mock returns well-shaped data', () => {
    const result = mockModule.useWaitForTransactionReceipt();

    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('isSuccess');
    expect(result).toHaveProperty('isError');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('error');
    expect(typeof result.isLoading).toBe('boolean');
    expect(typeof result.isSuccess).toBe('boolean');
  });

  it('useAccount() mock returns well-shaped data', () => {
    const result = mockModule.useAccount();

    expect(result).toHaveProperty('address');
    expect(result).toHaveProperty('isConnected');
    expect(result).toHaveProperty('isDisconnected');
    expect(result).toHaveProperty('isConnecting');
    expect(result).toHaveProperty('isReconnecting');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('chainId');
    expect(result).toHaveProperty('chain');
    expect(typeof result.address).toBe('string');
    expect(typeof result.isConnected).toBe('boolean');
    expect(typeof result.status).toBe('string');
    expect(typeof result.chainId).toBe('number');
  });

  it('useSignMessage() mock returns well-shaped data', () => {
    const result = mockModule.useSignMessage();

    expect(result).toHaveProperty('signMessageAsync');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('isPending');
    expect(result).toHaveProperty('isError');
    expect(result).toHaveProperty('isSuccess');
    expect(result).toHaveProperty('reset');
    expect(typeof result.signMessageAsync).toBe('function');
    expect(typeof result.reset).toBe('function');
    expect(typeof result.isPending).toBe('boolean');
  });

  it('useConnect() mock returns well-shaped data', () => {
    const result = mockModule.useConnect();

    expect(result).toHaveProperty('connect');
    expect(result).toHaveProperty('connectors');
    expect(result).toHaveProperty('isPending');
    expect(result).toHaveProperty('isError');
    expect(result).toHaveProperty('error');
    expect(typeof result.connect).toBe('function');
    expect(Array.isArray(result.connectors)).toBe(true);
  });

  it('useDisconnect() mock returns well-shaped data', () => {
    const result = mockModule.useDisconnect();

    expect(result).toHaveProperty('disconnect');
    expect(result).toHaveProperty('isPending');
    expect(typeof result.disconnect).toBe('function');
    expect(typeof result.isPending).toBe('boolean');
  });

  it('useReadContract() mock returns well-shaped data', () => {
    const result = mockModule.useReadContract();

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('isError');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('refetch');
    expect(typeof result.refetch).toBe('function');
    expect(typeof result.isLoading).toBe('boolean');
  });
});
