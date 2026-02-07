'use client';

import Link from 'next/link';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownLink,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import { Avatar, Name, Identity, Address } from '@coinbase/onchainkit/identity';
import { useAuth } from '@/hooks/useAuth';
import { TokenBalance } from '@/components/wallet/TokenBalance';
import { app } from '@/lib/config';

export function Header() {
  const { isLoggedIn } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-lg text-gray-900">
          {app.name}
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
            Home
          </Link>
          {isLoggedIn && (
            <Link href="/profile" className="text-gray-600 hover:text-gray-900 transition-colors">
              Profile
            </Link>
          )}
        </nav>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {isLoggedIn && <TokenBalance />}
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
              </Identity>
              <WalletDropdownLink icon="wallet" href="/profile">
                Profile
              </WalletDropdownLink>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </div>
    </header>
  );
}
