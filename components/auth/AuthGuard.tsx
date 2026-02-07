'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { SignInButton } from './SignInButton';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function AuthGuard({ children, fallback, redirectTo }: AuthGuardProps) {
  const router = useRouter();
  const { isLoggedIn, isLoading, isWalletConnected, walletAddress } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return <PageLoading message="Checking authentication..." />;
  }

  // If not logged in
  if (!isLoggedIn) {
    // Redirect if specified
    if (redirectTo) {
      router.push(redirectTo);
      return <PageLoading message="Redirecting..." />;
    }

    // Show fallback or default sign-in prompt
    if (fallback) {
      return <>{fallback}</>;
    }

    // Wallet connected but not signed in with SIWE
    if (isWalletConnected) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Complete Sign-In
            </h2>
            <p className="text-gray-600 mb-1">
              Wallet connected: <span className="font-mono text-sm">{walletAddress}</span>
            </p>
            <p className="text-gray-600 text-sm">
              Sign the message to verify ownership and access this page.
            </p>
          </div>
          <SignInButton />
        </div>
      );
    }

    // Not connected at all
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please connect your wallet to continue.
          </p>
        </div>
        <SignInButton />
      </div>
    );
  }

  return <>{children}</>;
}
