'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SignInButton } from '@/components/auth/SignInButton';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { useEffect } from 'react';

export default function JoinPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  // Redirect to home if already logged in
  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      router.push('/');
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading) {
    return <PageLoading message="Loading..." />;
  }

  if (isLoggedIn) {
    return <PageLoading message="Redirecting..." />;
  }

  return (
    <div className="container-page">
      <div className="max-w-md mx-auto py-12">
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In</h1>
          <p className="text-gray-600 mb-8">
            Connect your wallet to sign in to the app. You can use Coinbase Smart Wallet for a
            gasless experience or connect an existing wallet.
          </p>

          <SignInButton className="w-full" onSuccess={() => router.push('/')} />

          <div className="mt-6 text-sm text-gray-500">
            <p>
              By signing in, you agree to our{' '}
              <a href="/terms" className="link">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="link">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
