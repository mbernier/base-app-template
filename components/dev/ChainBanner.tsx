'use client';

import { useState } from 'react';
import { CHAIN_META } from '@/lib/chain';
import { farcaster } from '@/lib/config';

/**
 * Dev-mode banner showing the active chain, block explorer link,
 * faucet link (testnet only), and Farcaster testnet warning.
 * Only renders when NODE_ENV === 'development'.
 */
export function ChainBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (process.env.NODE_ENV !== 'development' || dismissed) {
    return null;
  }

  const showFarcasterWarning = farcaster.enabled && CHAIN_META.isTestnet;

  return (
    <div
      role="status"
      className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-sm text-yellow-900 flex items-center justify-between gap-4"
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-medium">{CHAIN_META.name}</span>
          <a
            href={CHAIN_META.blockExplorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-yellow-700"
          >
            Block Explorer
          </a>
          {CHAIN_META.faucetUrl && (
            <a
              href={CHAIN_META.faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-yellow-700"
            >
              Faucet
            </a>
          )}
        </div>
        {showFarcasterWarning && (
          <span className="text-yellow-800 text-xs">
            Farcaster enabled on testnet: identity works, but onchain transactions will fail.
          </span>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-yellow-700 hover:text-yellow-900 font-medium px-1"
        aria-label="Dismiss chain banner"
      >
        x
      </button>
    </div>
  );
}
