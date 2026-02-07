'use client';

import { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { AuthProvider } from '@/hooks/useAuth';
import { AnalyticsProvider } from '@/hooks/useAnalytics';
import { blockchain, onchainKit, app } from '@/lib/config';

const isMainnet = blockchain.chainId === 8453;
const chain = isMainnet ? base : baseSepolia;

// Create wagmi config with both possible chains to satisfy TypeScript
const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
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
        >
          <AuthProvider>
            <AnalyticsProvider>
              {mounted ? children : null}
            </AnalyticsProvider>
          </AuthProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
