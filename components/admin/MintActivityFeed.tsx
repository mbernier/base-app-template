'use client';

interface MintActivity {
  id: string;
  minterAddress: string;
  quantity: number;
  txHash: string | null;
  provider: string;
  status: string;
  createdAt: string;
}

interface MintActivityFeedProps {
  mints: MintActivity[];
  className?: string;
}

export function MintActivityFeed({ mints, className }: MintActivityFeedProps): React.ReactElement {
  if (mints.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className || ''}`}>
        <h3 className="font-semibold text-gray-900 mb-4">Recent Mints</h3>
        <p className="text-gray-500 text-sm">No mint activity yet.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className || ''}`}>
      <h3 className="font-semibold text-gray-900 mb-4">Recent Mints</h3>
      <div className="space-y-3">
        {mints.slice(0, 10).map((mint) => (
          <div key={mint.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-gray-700 truncate">
                {mint.minterAddress.slice(0, 6)}...{mint.minterAddress.slice(-4)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">
                  {new Date(mint.createdAt).toLocaleDateString()}
                </span>
                <span className="text-xs text-gray-400">
                  {mint.provider.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">x{mint.quantity}</span>
              <StatusBadge status={mint.status} />
              {mint.txHash && (
                <a
                  href={`https://basescan.org/tx/${mint.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  tx
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
