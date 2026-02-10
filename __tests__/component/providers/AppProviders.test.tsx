import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('wagmi', () => ({
  WagmiProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wagmi-provider">{children}</div>
  ),
  createConfig: () => ({}),
  http: () => ({}),
}));

vi.mock('wagmi/chains', () => ({
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
}));

// QueryClient must be a real class (used with `new` in AppProviders)
vi.mock('@tanstack/react-query', () => {
  class MockQueryClient {
    defaultOptions: Record<string, unknown>;
    constructor(opts?: Record<string, unknown>) {
      this.defaultOptions = opts ?? {};
    }
  }
  return {
    QueryClient: MockQueryClient,
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="query-client-provider">{children}</div>
    ),
  };
});

vi.mock('@coinbase/onchainkit', () => ({
  OnchainKitProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="onchainkit-provider">{children}</div>
  ),
}));

vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

vi.mock('@/hooks/useFarcaster', () => ({
  FarcasterProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="farcaster-provider">{children}</div>
  ),
}));

vi.mock('@/hooks/useAnalytics', () => ({
  AnalyticsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="analytics-provider">{children}</div>
  ),
}));

vi.mock('@/lib/config', () => ({
  blockchain: { chainId: 84532 },
  onchainKit: { cdpApiKey: 'test-key' },
  app: { name: 'Test App' },
}));

vi.mock('@/lib/chain', () => ({
  CHAIN_META: {
    chain: { id: 84532, name: 'Base Sepolia' },
    chainId: 84532,
    name: 'Base Sepolia',
    isTestnet: true,
    isMainnet: false,
    blockExplorerUrl: 'https://sepolia.basescan.org',
    faucetUrl: 'https://www.coinbase.com/faucets/base-ethereum-goerli-faucet',
    rpcUrl: null,
  },
}));

import { AppProviders } from '@/components/providers/AppProviders';
import { WagmiProvider, createConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { AuthProvider } from '@/hooks/useAuth';
import { FarcasterProvider } from '@/hooks/useFarcaster';
import { AnalyticsProvider } from '@/hooks/useAnalytics';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('provider mock contract validation', () => {
  it('mock provides WagmiProvider and createConfig', () => {
    expect(WagmiProvider).toBeDefined();
    expect(typeof createConfig).toBe('function');
  });

  it('mock provides QueryClient as a constructable class and QueryClientProvider', () => {
    expect(QueryClientProvider).toBeDefined();
    expect(QueryClient).toBeDefined();
    // Verify it can be constructed with new
    const instance = new QueryClient({ defaultOptions: {} });
    expect(instance).toBeTruthy();
  });

  it('mock provides OnchainKitProvider', () => {
    expect(OnchainKitProvider).toBeDefined();
  });

  it('mock provides AuthProvider', () => {
    expect(AuthProvider).toBeDefined();
  });

  it('mock provides FarcasterProvider', () => {
    expect(FarcasterProvider).toBeDefined();
  });

  it('mock provides AnalyticsProvider', () => {
    expect(AnalyticsProvider).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('AppProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders provider hierarchy with all required providers', async () => {
    render(
      <AppProviders>
        <div data-testid="child-content">Hello</div>
      </AppProviders>
    );

    // All providers should be in the tree
    expect(screen.getByTestId('wagmi-provider')).toBeInTheDocument();
    expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
    expect(screen.getByTestId('onchainkit-provider')).toBeInTheDocument();
    expect(screen.getByTestId('farcaster-provider')).toBeInTheDocument();
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-provider')).toBeInTheDocument();
  });

  it('renders children after mount (hydration guard)', async () => {
    render(
      <AppProviders>
        <div data-testid="child-content">Hello World</div>
      </AppProviders>
    );

    // Children should appear after useEffect sets mounted=true
    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
