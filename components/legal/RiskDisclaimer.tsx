'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface RiskDisclaimerProps {
  onDismiss?: () => void;
  className?: string;
}

export function RiskDisclaimer({ onDismiss, className }: RiskDisclaimerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className || ''}`}
      role="alert"
    >
      <div className="flex gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-800">Risk Warning</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Cryptocurrency investments carry significant risk. The value of digital assets can be
            highly volatile. Only invest what you can afford to lose. This is not financial advice.
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
            aria-label="Dismiss warning"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Compact version for inline usage
export function RiskDisclaimerCompact({ className }: { className?: string }) {
  return (
    <p className={`text-xs text-gray-500 ${className || ''}`}>
      <AlertTriangle className="inline w-3 h-3 mr-1" aria-hidden="true" />
      Crypto investments carry risk. Not financial advice.
    </p>
  );
}
