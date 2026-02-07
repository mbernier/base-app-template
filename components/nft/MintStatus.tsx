'use client';

import type { MintStatus as MintStatusType } from '@/types/nft';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface MintStatusProps {
  status: MintStatusType | 'idle';
  txHash?: string;
  error?: string | null;
}

export function MintStatus({ status, txHash, error }: MintStatusProps): React.ReactElement | null {
  if (status === 'idle') {
    return null;
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <LoadingSpinner size="sm" />
        <div>
          <p className="font-medium text-yellow-800">Minting in progress...</p>
          <p className="text-sm text-yellow-600">
            Please confirm the transaction in your wallet.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="font-medium text-green-800">Mint successful!</p>
        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 hover:underline"
          >
            View transaction
          </a>
        )}
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="font-medium text-red-800">Mint failed</p>
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>
    );
  }

  return null;
}
