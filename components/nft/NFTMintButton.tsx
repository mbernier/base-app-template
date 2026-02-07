'use client';

import { useNFTMint } from '@/hooks/useNFTMint';
import { Button } from '@/components/ui/Button';
import { MintStatus } from './MintStatus';

interface NFTMintButtonProps {
  collectionId: string;
  tokenId?: string;
  quantity?: number;
  buttonText?: string;
  className?: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

export function NFTMintButton({
  collectionId,
  tokenId,
  quantity = 1,
  buttonText = 'Mint',
  className,
  onSuccess,
  onError,
}: NFTMintButtonProps): React.ReactElement {
  const { mint, status, txHash, isLoading, error, reset } = useNFTMint();

  const handleMint = async () => {
    await mint(collectionId, tokenId, quantity);
  };

  // Callback effects
  if (status === 'confirmed' && txHash && onSuccess) {
    onSuccess(txHash);
  }
  if (status === 'failed' && error && onError) {
    onError(error);
  }

  if (status !== 'idle') {
    return (
      <div className={className}>
        <MintStatus status={status} txHash={txHash} error={error} />
        {(status === 'confirmed' || status === 'failed') && (
          <Button variant="outline" size="sm" onClick={reset} className="mt-2">
            {status === 'confirmed' ? 'Mint Another' : 'Try Again'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      onClick={handleMint}
      isLoading={isLoading}
      disabled={isLoading}
      className={className}
    >
      {buttonText}
      {quantity > 1 && ` (${quantity})`}
    </Button>
  );
}
