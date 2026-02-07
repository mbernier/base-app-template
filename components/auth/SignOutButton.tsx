'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

interface SignOutButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  onSuccess?: () => void;
}

export function SignOutButton({
  className,
  variant = 'ghost',
  onSuccess,
}: SignOutButtonProps) {
  const { isLoggedIn, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!isLoggedIn) {
    return null;
  }

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      onSuccess?.();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Button
      onClick={handleSignOut}
      isLoading={isSigningOut}
      variant={variant}
      className={className}
    >
      Sign Out
    </Button>
  );
}
