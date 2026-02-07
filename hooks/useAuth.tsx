'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useFarcasterContext } from '@/hooks/useFarcaster';
import type { AuthState, UserInfo } from '@/types/auth';

interface AuthContextType extends AuthState {
  isWalletConnected: boolean;
  walletAddress: `0x${string}` | undefined;
  isFarcasterAuth: boolean;
  fid?: number;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { isMiniApp, context } = useFarcasterContext();
  const farcasterAuthAttempted = useRef(false);

  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    isLoading: true,
  });

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();

      setAuthState({
        isLoggedIn: data.isLoggedIn,
        isLoading: false,
        address: data.address,
        user: data.user,
      });
    } catch {
      setAuthState({ isLoggedIn: false, isLoading: false });
    }
  }, []);

  // Check session on mount
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Handle wallet disconnect
  useEffect(() => {
    if (!isConnected && authState.isLoggedIn) {
      signOut();
    }
  }, [isConnected, authState.isLoggedIn]);

  // Farcaster auto-auth: when inside a mini-app with wallet connected
  useEffect(() => {
    if (
      !isMiniApp ||
      !context ||
      !isConnected ||
      !address ||
      authState.isLoggedIn ||
      authState.isLoading ||
      farcasterAuthAttempted.current
    ) {
      return;
    }

    farcasterAuthAttempted.current = true;
    const user = context.user;

    (async () => {
      try {
        setAuthState((prev) => ({ ...prev, isLoading: true }));

        const res = await fetch('/api/auth/farcaster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: user.fid,
            address,
            username: user.username,
            displayName: user.displayName,
            pfpUrl: user.pfpUrl,
          }),
        });

        if (!res.ok) {
          throw new Error('Farcaster auth failed');
        }

        const data = (await res.json()) as { user: UserInfo };

        setAuthState({
          isLoggedIn: true,
          isLoading: false,
          address,
          user: data.user,
        });
      } catch (error) {
        console.error('Farcaster auto-auth failed:', error);
        farcasterAuthAttempted.current = false;
        setAuthState({ isLoggedIn: false, isLoading: false });
      }
    })();
  }, [isMiniApp, context, isConnected, address, authState.isLoggedIn, authState.isLoading]);

  const signIn = async () => {
    if (!address || !chainId) {
      throw new Error('Wallet not connected');
    }

    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Get SIWE message
      const messageRes = await fetch(`/api/auth/siwe?address=${address}&chainId=${chainId}`);
      const { message } = await messageRes.json();

      // Sign message
      const signature = await signMessageAsync({ message });

      // Verify and create session
      const verifyRes = await fetch('/api/auth/siwe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) {
        throw new Error('Verification failed');
      }

      const { user } = (await verifyRes.json()) as { user: UserInfo };

      setAuthState({
        isLoggedIn: true,
        isLoading: false,
        address,
        user,
      });
    } catch (error) {
      setAuthState({ isLoggedIn: false, isLoading: false });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      disconnect();
    } finally {
      setAuthState({ isLoggedIn: false, isLoading: false });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        isWalletConnected: isConnected,
        walletAddress: address,
        isFarcasterAuth: isMiniApp && authState.isLoggedIn,
        fid: context?.user.fid,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
