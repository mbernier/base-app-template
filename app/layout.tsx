import type { Metadata, Viewport } from 'next';
import { AppProviders } from '@/components/providers/AppProviders';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { app } from '@/lib/config';
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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
            <Footer className="hidden md:block" />
            <MobileNav className="md:hidden" />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
