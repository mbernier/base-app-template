import { base, baseSepolia } from 'viem/chains';
import type { Chain } from 'viem/chains';
import { blockchain } from './config';

export interface ChainMetadata {
  chain: Chain;
  chainId: number;
  name: string;
  isTestnet: boolean;
  isMainnet: boolean;
  blockExplorerUrl: string;
  faucetUrl: string | null;
  rpcUrl: string | null;
}

/**
 * Build chain metadata from current config.
 * Reads `blockchain.chainId` from lib/config.ts and optional
 * `NEXT_PUBLIC_RPC_URL` env var for custom RPC endpoints.
 */
export function getChainMetadata(): ChainMetadata {
  const isMainnet = blockchain.chainId === 8453;
  const chain = isMainnet ? base : baseSepolia;
  const customRpcUrl = process.env.NEXT_PUBLIC_RPC_URL || null;

  return {
    chain,
    chainId: blockchain.chainId,
    name: chain.name,
    isTestnet: !isMainnet,
    isMainnet,
    blockExplorerUrl: isMainnet ? 'https://basescan.org' : 'https://sepolia.basescan.org',
    faucetUrl: isMainnet ? null : 'https://www.coinbase.com/faucets/base-ethereum-goerli-faucet',
    rpcUrl: customRpcUrl,
  };
}

/** Cached chain metadata -- evaluated once at module load. */
export const CHAIN_META = getChainMetadata();

/** The viem Chain object for the active chain. */
export const CHAIN = CHAIN_META.chain;

/** Convenience booleans. */
export const isTestnet = CHAIN_META.isTestnet;
export const isMainnet = CHAIN_META.isMainnet;

/** Convenience strings. */
export const BLOCK_EXPLORER_URL = CHAIN_META.blockExplorerUrl;
export const FAUCET_URL = CHAIN_META.faucetUrl;
