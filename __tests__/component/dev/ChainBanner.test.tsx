import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks -- vi.hoisted ensures these are available when vi.mock factories run
// ---------------------------------------------------------------------------
const { mockChainMeta, mockFarcaster } = vi.hoisted(() => ({
  mockChainMeta: {
    chain: { id: 84532, name: 'Base Sepolia' },
    chainId: 84532,
    name: 'Base Sepolia',
    isTestnet: true,
    isMainnet: false,
    blockExplorerUrl: 'https://sepolia.basescan.org',
    faucetUrl: 'https://www.coinbase.com/faucets/base-ethereum-goerli-faucet',
    rpcUrl: null,
  },
  mockFarcaster: {
    enabled: true,
  },
}));

vi.mock('@/lib/chain', () => ({
  CHAIN_META: mockChainMeta,
}));

vi.mock('@/lib/config', () => ({
  farcaster: mockFarcaster,
}));

import { ChainBanner } from '@/components/dev/ChainBanner';
import { CHAIN_META } from '@/lib/chain';
import { farcaster } from '@/lib/config';

// Helper to set NODE_ENV without TS readonly error
const env = process.env as Record<string, string | undefined>;

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('ChainBanner mock contract validation', () => {
  it('CHAIN_META mock has required properties', () => {
    expect(CHAIN_META).toHaveProperty('name');
    expect(CHAIN_META).toHaveProperty('isTestnet');
    expect(CHAIN_META).toHaveProperty('isMainnet');
    expect(CHAIN_META).toHaveProperty('blockExplorerUrl');
    expect(CHAIN_META).toHaveProperty('faucetUrl');
  });

  it('farcaster mock has enabled property', () => {
    expect(farcaster).toHaveProperty('enabled');
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ChainBanner', () => {
  const originalNodeEnv = env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to development
    env.NODE_ENV = 'development';

    // Reset mock to testnet defaults
    Object.assign(mockChainMeta, {
      chain: { id: 84532, name: 'Base Sepolia' },
      chainId: 84532,
      name: 'Base Sepolia',
      isTestnet: true,
      isMainnet: false,
      blockExplorerUrl: 'https://sepolia.basescan.org',
      faucetUrl: 'https://www.coinbase.com/faucets/base-ethereum-goerli-faucet',
      rpcUrl: null,
    });
    mockFarcaster.enabled = true;
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
  });

  it('renders in development mode with chain name', () => {
    render(<ChainBanner />);
    expect(screen.getByText('Base Sepolia')).toBeInTheDocument();
  });

  it('does not render in production mode', () => {
    env.NODE_ENV = 'production';
    const { container } = render(<ChainBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('shows block explorer link', () => {
    render(<ChainBanner />);
    const link = screen.getByText('Block Explorer');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://sepolia.basescan.org');
  });

  it('shows faucet link on testnet', () => {
    render(<ChainBanner />);
    expect(screen.getByText('Faucet')).toBeInTheDocument();
  });

  it('hides faucet link on mainnet', () => {
    Object.assign(mockChainMeta, {
      chain: { id: 8453, name: 'Base' },
      chainId: 8453,
      name: 'Base',
      isTestnet: false,
      isMainnet: true,
      blockExplorerUrl: 'https://basescan.org',
      faucetUrl: null,
    });

    render(<ChainBanner />);
    expect(screen.queryByText('Faucet')).not.toBeInTheDocument();
  });

  it('shows Farcaster warning when farcaster.enabled && isTestnet', () => {
    render(<ChainBanner />);
    expect(screen.getByText(/Farcaster enabled on testnet/)).toBeInTheDocument();
  });

  it('hides Farcaster warning when farcaster is disabled', () => {
    mockFarcaster.enabled = false;
    render(<ChainBanner />);
    expect(screen.queryByText(/Farcaster enabled on testnet/)).not.toBeInTheDocument();
  });

  it('hides Farcaster warning on mainnet even when farcaster is enabled', () => {
    Object.assign(mockChainMeta, {
      isTestnet: false,
      isMainnet: true,
      name: 'Base',
      faucetUrl: null,
    });
    render(<ChainBanner />);
    expect(screen.queryByText(/Farcaster enabled on testnet/)).not.toBeInTheDocument();
  });

  it('is dismissible via close button', () => {
    render(<ChainBanner />);
    expect(screen.getByText('Base Sepolia')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dismiss chain banner'));
    expect(screen.queryByText('Base Sepolia')).not.toBeInTheDocument();
  });
});
