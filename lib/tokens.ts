import { parseUnits, formatUnits, type Address } from 'viem';
import { blockchain } from './config';

export { CHAIN } from './chain';

export const TOKEN_CONFIG = {
  address: blockchain.tokenAddress,
  symbol: blockchain.tokenSymbol,
  decimals: blockchain.tokenDecimals,
};

// ERC-20 ABI (minimal)
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;

// Parse token amount (string to bigint)
export function parseTokenAmount(amount: string): bigint {
  return parseUnits(amount, TOKEN_CONFIG.decimals);
}

// Format token amount (bigint to string)
export function formatTokenAmount(amount: bigint, decimals?: number): string {
  const formatted = formatUnits(amount, TOKEN_CONFIG.decimals);
  if (decimals !== undefined) {
    return parseFloat(formatted).toFixed(decimals);
  }
  return formatted;
}

// Build transfer transaction
export function buildTransferTx(to: Address, amount: bigint) {
  if (!TOKEN_CONFIG.address) {
    throw new Error('Token address not configured');
  }
  return {
    address: TOKEN_CONFIG.address,
    abi: ERC20_ABI,
    functionName: 'transfer' as const,
    args: [to, amount] as const,
  };
}

// Build approve transaction
export function buildApproveTx(spender: Address, amount: bigint) {
  if (!TOKEN_CONFIG.address) {
    throw new Error('Token address not configured');
  }
  return {
    address: TOKEN_CONFIG.address,
    abi: ERC20_ABI,
    functionName: 'approve' as const,
    args: [spender, amount] as const,
  };
}
