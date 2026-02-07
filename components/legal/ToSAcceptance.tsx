'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

const TOS_VERSION = '1.0.0';

interface ToSAcceptanceProps {
  onAccept: () => void;
  onDecline?: () => void;
}

export function ToSAcceptance({ onAccept, onDecline }: ToSAcceptanceProps) {
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      // Record acceptance
      await fetch('/api/user/accept-tos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: TOS_VERSION }),
      });

      onAccept();
    } catch (error) {
      console.error('Failed to accept ToS:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tos-title"
    >
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 id="tos-title" className="text-xl font-bold text-gray-900 mb-4">
          Terms of Service
        </h2>

        <div className="text-sm text-gray-600 mb-4 max-h-60 overflow-y-auto">
          <p className="mb-2">By using this application, you agree to the following:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>This service is provided &quot;as is&quot; without warranties</li>
            <li>You use this application at your own risk</li>
            <li>We do not provide financial or investment advice</li>
            <li>You are responsible for securing your wallet</li>
            <li>Cryptocurrency transactions are irreversible</li>
          </ul>
        </div>

        <label className="flex items-start gap-3 mb-4">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            I have read and agree to the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Privacy Policy
            </a>
          </span>
        </label>

        <div className="flex gap-3">
          {onDecline && (
            <Button variant="outline" onClick={onDecline} className="flex-1">
              Decline
            </Button>
          )}
          <Button
            onClick={handleAccept}
            disabled={!accepted}
            isLoading={isSubmitting}
            className="flex-1"
          >
            Accept &amp; Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

export { TOS_VERSION };
