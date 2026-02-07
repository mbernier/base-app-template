'use client';

import { useState, useEffect } from 'react';
import { features } from '@/lib/config';
import type { AuditLogEntry } from '@/app/api/user/audit-log/route';

interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

function StatusBadge({ status }: { status: number }) {
  const getColor = () => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800';
    if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-800';
    if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getColor()}`}>
      {status}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  const getColor = () => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-100 text-blue-800';
      case 'POST':
        return 'bg-green-100 text-green-800';
      case 'PUT':
      case 'PATCH':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getColor()}`}>
      {method}
    </span>
  );
}

export function UserAuditLog() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const limit = 10;

  const isEnabled = features.showUserAuditLog;

  useEffect(() => {
    if (!isEnabled) {
      setIsLoading(false);
      return;
    }

    async function fetchAuditLog() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/user/audit-log?limit=${limit}&offset=${page * limit}`);

        if (!res.ok) {
          if (res.status === 404) {
            setError('Audit log feature is not enabled');
          } else {
            setError('Failed to load audit log');
          }
          return;
        }

        const result = await res.json();
        setData(result);
      } catch {
        setError('Failed to load audit log');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAuditLog();
  }, [page, isEnabled]);

  // Don't render if feature is disabled
  if (!isEnabled) {
    return null;
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
      <p className="text-sm text-gray-500 mb-4">
        Your recent API activity and requests.
      </p>

      {isLoading && (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      )}

      {error && (
        <div className="text-center py-8 text-red-500">{error}</div>
      )}

      {!isLoading && !error && data && (
        <>
          {data.entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No activity recorded yet.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Time</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Method</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Endpoint</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Status</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Time (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 text-gray-500 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 px-2">
                          <MethodBadge method={entry.method} />
                        </td>
                        <td className="py-2 px-2 font-mono text-xs text-gray-700 truncate max-w-[200px]">
                          {entry.endpoint}
                        </td>
                        <td className="py-2 px-2">
                          <StatusBadge status={entry.response_status} />
                        </td>
                        <td className="py-2 px-2 text-right text-gray-500">
                          {entry.response_time_ms ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Showing {page * limit + 1}-{Math.min((page + 1) * limit, data.total)} of {data.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
