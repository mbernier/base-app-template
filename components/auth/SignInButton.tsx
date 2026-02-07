'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWallet, Wallet } from '@coinbase/onchainkit/wallet';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

interface SignInButtonProps {
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function SignInButton({ className, onSuccess, onError }: SignInButtonProps) {
  const { isConnected } = useAccount();
  const { isLoggedIn, isLoading, signIn } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // If not connected, show connect wallet button
  if (!isConnected) {
    return (
      <Wallet>
        <ConnectWallet className={className} />
      </Wallet>
    );
  }

  // If already logged in, don't show anything
  if (isLoggedIn) {
    return null;
  }

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn();
      onSuccess?.();
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <Button
      onClick={handleSignIn}
      isLoading={isLoading || isSigningIn}
      className={className}
    >
      Sign In
    </Button>
  );
}
