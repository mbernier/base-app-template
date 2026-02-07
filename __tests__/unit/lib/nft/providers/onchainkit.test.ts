/**
 * Unit tests for lib/nft/providers/onchainkit.ts
 *
 * The OnchainKitProvider uses no external SDKs -- it works directly
 * with ERC-721/1155 ABIs, so no mocking is required.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { Address } from 'viem';
import { OnchainKitProvider } from '@/lib/nft/providers/onchainkit';
import { ERC721_ABI, ERC1155_ABI } from '@/lib/nft/abis';

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890' as Address;
const MINTER_ADDRESS = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' as Address;

describe('OnchainKitProvider', () => {
  let provider: OnchainKitProvider;

  beforeEach(() => {
    provider = new OnchainKitProvider();
  });

  // -----------------------------------------------------------------------
  // providerType
  // -----------------------------------------------------------------------
  it('has providerType "onchainkit"', () => {
    expect(provider.providerType).toBe('onchainkit');
  });

  // -----------------------------------------------------------------------
  // getTokenMetadata
  // -----------------------------------------------------------------------
  describe('getTokenMetadata', () => {
    it('returns name "Token" when no tokenId is provided', async () => {
      const metadata = await provider.getTokenMetadata(TEST_ADDRESS);
      expect(metadata.name).toBe('Token');
    });

    it('returns name "Token 5" when tokenId is "5"', async () => {
      const metadata = await provider.getTokenMetadata(TEST_ADDRESS, '5');
      expect(metadata.name).toBe('Token 5');
    });

    it('returns an empty attributes array', async () => {
      const metadata = await provider.getTokenMetadata(TEST_ADDRESS);
      expect(metadata.attributes).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // buildMintTransaction
  // -----------------------------------------------------------------------
  describe('buildMintTransaction', () => {
    it('returns ERC-721 mint calls when no tokenId is provided', async () => {
      const result = await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        minterAddress: MINTER_ADDRESS,
        quantity: 1,
        providerConfig: {},
      });

      expect(result.calls).toHaveLength(1);
      expect(result.calls[0].abi).toBe(ERC721_ABI);
      expect(result.calls[0].functionName).toBe('mint');
      expect(result.calls[0].args).toEqual([MINTER_ADDRESS]);
    });

    it('returns one call per token when quantity is > 1 (ERC-721)', async () => {
      const result = await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        minterAddress: MINTER_ADDRESS,
        quantity: 3,
        providerConfig: {},
      });

      expect(result.calls).toHaveLength(3);
      for (const call of result.calls) {
        expect(call.functionName).toBe('mint');
        expect(call.args).toEqual([MINTER_ADDRESS]);
      }
    });

    it('returns ERC-1155 safeTransferFrom call when tokenId is provided', async () => {
      const result = await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        tokenId: '42',
        minterAddress: MINTER_ADDRESS,
        quantity: 2,
        providerConfig: {},
      });

      expect(result.calls).toHaveLength(1);
      const call = result.calls[0];
      expect(call.abi).toBe(ERC1155_ABI);
      expect(call.functionName).toBe('safeTransferFrom');
      expect(call.args).toEqual([
        TEST_ADDRESS,    // from (contract as minter)
        MINTER_ADDRESS,  // to
        BigInt(42),      // tokenId
        BigInt(2),       // quantity
        '0x',            // data
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // validateConfig
  // -----------------------------------------------------------------------
  describe('validateConfig', () => {
    it('returns true for an empty config', () => {
      expect(provider.validateConfig({})).toBe(true);
    });

    it('returns false when tokenId is a number instead of a string', () => {
      expect(provider.validateConfig({ tokenId: 123 })).toBe(false);
    });
  });
});
