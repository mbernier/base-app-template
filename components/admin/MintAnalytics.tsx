'use client';

import { StatCard } from './StatCard';

interface MintAnalyticsProps {
  totalMints: number;
  totalQuantity: number;
  uniqueMinters: number;
  className?: string;
}

export function MintAnalytics({
  totalMints,
  totalQuantity,
  uniqueMinters,
  className,
}: MintAnalyticsProps): React.ReactElement {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${className || ''}`}>
      <StatCard label="Total Mints" value={totalMints} />
      <StatCard label="Total Quantity" value={totalQuantity} />
      <StatCard label="Unique Minters" value={uniqueMinters} />
    </div>
  );
}
