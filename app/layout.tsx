import type { Metadata, Viewport } from 'next';
import { AppProviders } from '@/components/providers/AppProviders';
import { AppShell } from '@/components/layout/AppShell';
import { app, farcaster } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: app.name,
    template: `%s | ${app.name}`,
  },
  description: 'A Base Mini App built with OnchainKit',
  keywords: ['Base', 'Ethereum', 'Web3', 'DeFi', 'NFT'],
  authors: [{ name: 'Base App Template' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: app.url,
    siteName: app.name,
    title: app.name,
    description: 'A Base Mini App built with OnchainKit',
  },
  twitter: {
    card: 'summary_large_image',
    title: app.name,
    description: 'A Base Mini App built with OnchainKit',
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    ...(farcaster.enabled
      ? {
          'fc:miniapp': JSON.stringify({
            version: '1',
            imageUrl: farcaster.imageUrl || `${app.url}/og-image.png`,
            button: {
              title: farcaster.buttonTitle,
              action: {
                type: 'launch_miniapp',
                url: app.url,
                splashImageUrl: farcaster.splashImageUrl || `${app.url}/splash.png`,
                splashBackgroundColor: farcaster.splashBgColor,
              },
            },
          }),
        }
      : {}),
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/onchainkit.css" />
      </head>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
