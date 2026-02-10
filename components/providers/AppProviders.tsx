'use client';

import { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { AuthProvider } from '@/hooks/useAuth';
import { FarcasterProvider } from '@/hooks/useFarcaster';
import { AnalyticsProvider } from '@/hooks/useAnalytics';
import { onchainKit, app } from '@/lib/config';
import { CHAIN_META } from '@/lib/chain';

const chain = CHAIN_META.chain;

// Create wagmi config with both possible chains to satisfy TypeScript.
// Use custom RPC URL if configured, otherwise fall back to default public RPC.
const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(CHAIN_META.isMainnet && CHAIN_META.rpcUrl ? CHAIN_META.rpcUrl : undefined),
    [baseSepolia.id]: http(
      CHAIN_META.isTestnet && CHAIN_META.rpcUrl ? CHAIN_META.rpcUrl : undefined
    ),
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [mounted, setMounted] = useState(false);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
          },
        },
      })
  );

  // Prevent hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={onchainKit.cdpApiKey}
          chain={chain}
          config={{
            appearance: {
              name: app.name,
              mode: 'auto',
              theme: 'default',
            },
            wallet: {
              display: 'modal',
              termsUrl: '/terms',
              privacyUrl: '/privacy',
            },
          }}
          miniKit={{ enabled: true }}
        >
          <FarcasterProvider>
            <AuthProvider>
              <AnalyticsProvider>{mounted ? children : null}</AnalyticsProvider>
            </AuthProvider>
          </FarcasterProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
