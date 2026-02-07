'use client';

import { useAuth } from '@/hooks/useAuth';
import { SignInButton } from '@/components/auth/SignInButton';
import { TokenBalance } from '@/components/wallet/TokenBalance';
import { RiskDisclaimer } from '@/components/legal/RiskDisclaimer';
import { app } from '@/lib/config';

export default function HomePage() {
  const { isLoggedIn, isWalletConnected, walletAddress, user, isLoading } = useAuth();

  return (
    <div className="container-page">
      {/* Hero Section */}
      <section className="text-center py-12 md:py-20">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{app.name}</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Welcome to your Base Mini App. Connect your wallet to get started with the decentralized
          experience.
        </p>

        {/* Not connected at all */}
        {!isLoading && !isWalletConnected && (
          <div className="flex flex-col items-center gap-4">
            <SignInButton />
            <p className="text-sm text-gray-600">Connect with Smart Wallet or existing wallet</p>
          </div>
        )}

        {/* Wallet connected but not signed in with SIWE */}
        {!isLoading && isWalletConnected && !isLoggedIn && (
          <div className="card max-w-md mx-auto p-6">
            <p className="text-sm text-gray-600 mb-2">Wallet connected</p>
            <p className="font-mono text-sm text-gray-900 mb-4">{walletAddress}</p>
            <SignInButton />
            <p className="text-xs text-gray-600 mt-2">Sign the message to complete authentication</p>
          </div>
        )}

        {/* Fully authenticated */}
        {isLoggedIn && user && (
          <div className="card max-w-md mx-auto p-6">
            <p className="text-sm text-gray-600 mb-2">Welcome back!</p>
            <p className="font-mono text-sm text-gray-900 mb-4">{user.address}</p>
            <div className="flex justify-center">
              <TokenBalance className="text-lg" />
            </div>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Smart Wallet</h3>
            <p className="text-sm text-gray-600">
              Gasless transactions with Coinbase Smart Wallet. No seed phrases needed.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Secure Auth</h3>
            <p className="text-sm text-gray-600">
              Sign-In With Ethereum (SIWE) for secure, wallet-based authentication.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Base Network</h3>
            <p className="text-sm text-gray-600">
              Built on Base for fast, low-cost transactions on Ethereum L2.
            </p>
          </div>
        </div>
      </section>

      {/* Risk Disclaimer */}
      <section className="py-8">
        <RiskDisclaimer className="max-w-2xl mx-auto" />
      </section>
    </div>
  );
}
