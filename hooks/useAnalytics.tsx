'use client';

import { createContext, useContext, useEffect, ReactNode, useCallback, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageVisit, trackEvent } from '@/lib/analytics';

interface AnalyticsContextType {
  trackEvent: (eventType: string, properties?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page visits on route change
  useEffect(() => {
    trackPageVisit(pathname);
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const handleTrackEvent = useCallback(
    (eventType: string, properties?: Record<string, unknown>) => {
      trackEvent(eventType, properties);
    },
    []
  );

  return (
    <AnalyticsContext.Provider value={{ trackEvent: handleTrackEvent }}>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
}
