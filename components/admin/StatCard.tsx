'use client';

interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function StatCard({ label, value, className }: StatCardProps): React.ReactElement {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className || ''}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}
