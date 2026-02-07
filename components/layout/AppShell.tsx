'use client';

import { ReactNode } from 'react';
import { useFarcasterContext } from '@/hooks/useFarcaster';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isMiniApp } = useFarcasterContext();

  // In mini-app mode: hide Header/Footer/MobileNav (host provides chrome)
  // Apply safe area insets via CSS custom properties set by MiniKit
  if (isMiniApp) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{
          paddingTop: 'var(--ock-minikit-safe-area-inset-top, 0px)',
          paddingBottom: 'var(--ock-minikit-safe-area-inset-bottom, 0px)',
          paddingLeft: 'var(--ock-minikit-safe-area-inset-left, 0px)',
          paddingRight: 'var(--ock-minikit-safe-area-inset-right, 0px)',
        }}
      >
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  // Standalone mode: render everything as before
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <Footer className="hidden md:block" />
      <MobileNav className="md:hidden" />
    </div>
  );
}
