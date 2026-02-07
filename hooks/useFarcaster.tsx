'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import type { Context } from '@farcaster/miniapp-sdk';

interface FarcasterContextType {
  /** Whether the app is running inside a Farcaster/Base mini-app client */
  isMiniApp: boolean;
  /** Whether the SDK has signaled ready (splash screen dismissed) */
  isReady: boolean;
  /** Raw SDK context (user FID, client info, location, etc.) */
  context: Context.MiniAppContext | null;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isMiniApp: false,
  isReady: false,
  context: null,
});

export function FarcasterProvider({ children }: { children: ReactNode }) {
  const { context, isMiniAppReady, setMiniAppReady } = useMiniKit();
  const [isReady, setIsReady] = useState(false);

  const isMiniApp = context !== null;

  // Signal ready to dismiss the splash screen when inside a mini-app
  useEffect(() => {
    if (isMiniApp && !isMiniAppReady) {
      setMiniAppReady().then(() => {
        setIsReady(true);
      });
    } else if (isMiniAppReady) {
      setIsReady(true);
    }
  }, [isMiniApp, isMiniAppReady, setMiniAppReady]);

  return (
    <FarcasterContext.Provider value={{ isMiniApp, isReady, context }}>
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcasterContext() {
  return useContext(FarcasterContext);
}
