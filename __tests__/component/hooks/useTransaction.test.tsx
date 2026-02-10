/**
 * Tests for useTransaction hook.
 *
 * External mocks:
 *   - wagmi (useWriteContract, useWaitForTransactionReceipt)
 *   - @/lib/config (blockchain config for TOKEN_CONFIG used by lib/tokens)
 *
 * We do NOT mock @/lib/tokens because we own it -- buildTransferTx,
 * buildApproveTx, parseTokenAmount run through the real code.
 *
 * No AuthProvider/FarcasterProvider wrapper needed since useTransaction
 * does not consume any context providers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Address } from 'viem';

// ---------------------------------------------------------------------------
// External mocks — must appear before importing modules that use them
// ---------------------------------------------------------------------------

const mockWriteContractAsync = vi.fn();
const mockResetWrite = vi.fn();

vi.mock('@/lib/config', () => ({
  blockchain: {
    tokenAddress: '0xTOKEN0000000000000000000000000000000000' as `0x${string}`,
    tokenSymbol: 'TEST',
    tokenDecimals: 18,
    chainId: 84532,
  },
  app: {
    url: 'http://localhost:3100',
    name: 'Test App',
    env: 'test',
    isProduction: false,
  },
  database: { supabaseUrl: '', supabaseAnonKey: '', supabaseServiceRoleKey: '' },
  auth: {
    sessionSecret: 'test',
    sessionDuration: 86400,
    siweDomain: 'localhost',
    siweStatement: 'Sign in',
  },
  farcaster: { enabled: false },
  onchainKit: {},
  nft: {},
  features: {},
  admin: {},
  rateLimit: { windowMs: 60000, maxRequests: 100 },
  validateServerConfig: vi.fn(),
}));

vi.mock('wagmi', () => ({
  useWriteContract: vi.fn().mockReturnValue({
    writeContractAsync: vi.fn(),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useWaitForTransactionReceipt: vi.fn().mockReturnValue({
    isLoading: false,
    isSuccess: false,
  }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useTransaction } from '@/hooks/useTransaction';
import { TOKEN_CONFIG, ERC20_ABI } from '@/lib/tokens';

const mockUseWriteContract = vi.mocked(useWriteContract);
const mockUseWaitForTransactionReceipt = vi.mocked(useWaitForTransactionReceipt);

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('wagmi mock contract validation (useTransaction scope)', () => {
  it('useWriteContract mock has required fields', () => {
    const result = mockUseWriteContract();
    expect(result).toHaveProperty('writeContractAsync');
    expect(result).toHaveProperty('isPending');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('reset');
    expect(typeof result.writeContractAsync).toBe('function');
    expect(typeof result.reset).toBe('function');
  });

  it('useWaitForTransactionReceipt mock has required fields', () => {
    const result = mockUseWaitForTransactionReceipt(
      {} as Parameters<typeof useWaitForTransactionReceipt>[0]
    );
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('isSuccess');
    expect(typeof result.isLoading).toBe('boolean');
    expect(typeof result.isSuccess).toBe('boolean');
  });

  it('mock exports match real wagmi module exports', async () => {
    const realModule = await vi.importActual<Record<string, unknown>>('wagmi');
    for (const key of ['useWriteContract', 'useWaitForTransactionReceipt']) {
      expect(realModule).toHaveProperty(key);
      expect(typeof realModule[key]).toBe('function');
    }
  });
});

// ---------------------------------------------------------------------------
// useTransaction tests
// ---------------------------------------------------------------------------
describe('useTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockWriteContractAsync.mockResolvedValue('0xhash123' as `0x${string}`);

    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
      error: null,
      reset: mockResetWrite,
    } as unknown as ReturnType<typeof useWriteContract>);

    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    } as unknown as ReturnType<typeof useWaitForTransactionReceipt>);
  });

  it('initial state: isLoading=false, isPending=false, isSuccess=false, txHash=undefined', () => {
    const { result } = renderHook(() => useTransaction());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.txHash).toBeUndefined();
  });

  it('transfer() calls writeContractAsync with correct params', async () => {
    const { result } = renderHook(() => useTransaction());

    const to = '0xRECIPIENT000000000000000000000000000000' as Address;
    const amount = '1.5';

    await act(async () => {
      await result.current.transfer(to, amount);
    });

    expect(mockWriteContractAsync).toHaveBeenCalledTimes(1);

    const callArg = mockWriteContractAsync.mock.calls[0][0];
    expect(callArg.address).toBe(TOKEN_CONFIG.address);
    expect(callArg.abi).toBe(ERC20_ABI);
    expect(callArg.functionName).toBe('transfer');
    expect(callArg.args[0]).toBe(to);
    // 1.5 tokens with 18 decimals = 1500000000000000000n
    expect(callArg.args[1]).toBe(BigInt('1500000000000000000'));
  });

  it('transfer() returns hash on success', async () => {
    const expectedHash = '0xhash123';
    mockWriteContractAsync.mockResolvedValue(expectedHash as `0x${string}`);

    const { result } = renderHook(() => useTransaction());

    let hash: string | undefined;
    await act(async () => {
      hash = await result.current.transfer(
        '0xRECIPIENT000000000000000000000000000000' as Address,
        '1.0'
      );
    });

    expect(hash).toBe(expectedHash);
  });

  it('transfer() returns undefined on error', async () => {
    mockWriteContractAsync.mockRejectedValue(new Error('User rejected'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useTransaction());

    let hash: string | undefined;
    await act(async () => {
      hash = await result.current.transfer(
        '0xRECIPIENT000000000000000000000000000000' as Address,
        '1.0'
      );
    });

    expect(hash).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith('Transfer failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('approve() calls writeContractAsync with correct params', async () => {
    const { result } = renderHook(() => useTransaction());

    const spender = '0xSPENDER0000000000000000000000000000000' as Address;
    const amount = '100.0';

    await act(async () => {
      await result.current.approve(spender, amount);
    });

    expect(mockWriteContractAsync).toHaveBeenCalledTimes(1);

    const callArg = mockWriteContractAsync.mock.calls[0][0];
    expect(callArg.address).toBe(TOKEN_CONFIG.address);
    expect(callArg.abi).toBe(ERC20_ABI);
    expect(callArg.functionName).toBe('approve');
    expect(callArg.args[0]).toBe(spender);
    // 100 tokens with 18 decimals
    expect(callArg.args[1]).toBe(BigInt('100000000000000000000'));
  });

  it('approve() returns undefined on error', async () => {
    mockWriteContractAsync.mockRejectedValue(new Error('User rejected'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useTransaction());

    let hash: string | undefined;
    await act(async () => {
      hash = await result.current.approve(
        '0xSPENDER0000000000000000000000000000000' as Address,
        '50.0'
      );
    });

    expect(hash).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith('Approve failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('reset() clears txHash and calls resetWrite', async () => {
    const { result } = renderHook(() => useTransaction());

    // First do a transfer to set txHash
    await act(async () => {
      await result.current.transfer('0xRECIPIENT000000000000000000000000000000' as Address, '1.0');
    });

    expect(result.current.txHash).toBe('0xhash123');

    // Now reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.txHash).toBeUndefined();
    expect(mockResetWrite).toHaveBeenCalled();
  });
});
