'use client';

import { useTokenBalance } from '@/hooks/useTokenBalance';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface TokenBalanceProps {
  className?: string;
  showSymbol?: boolean;
}

export function TokenBalance({ className, showSymbol = true }: TokenBalanceProps) {
  const { balanceFormatted, isLoading, symbol } = useTokenBalance();

  if (isLoading) {
    return (
      <div className={`flex items-center ${className || ''}`}>
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return (
    <div className={`flex items-center text-sm font-medium text-gray-700 ${className || ''}`}>
      <span>{balanceFormatted}</span>
      {showSymbol && <span className="ml-1 text-gray-500">{symbol}</span>}
    </div>
  );
}
