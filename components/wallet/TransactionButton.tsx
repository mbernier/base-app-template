'use client';

import type { ComponentType } from 'react';
import {
  Transaction,
  TransactionButton as TransactionButtonBase,
  TransactionSponsor,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
  type LifecycleStatus,
} from '@coinbase/onchainkit/transaction';
import type { ContractFunctionParameters } from 'viem';
import { CHAIN } from '@/lib/tokens';

// OnchainKit v1 component types are built for React 19 — cast for React 18 compat
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TransactionButton = TransactionButtonBase as ComponentType<any>;

interface TransactionButtonWrapperProps {
  calls: ContractFunctionParameters[];
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
  buttonText?: string;
  disabled?: boolean;
  className?: string;
}

export function TransactionButtonWrapper({
  calls,
  onSuccess,
  onError,
  buttonText = 'Submit Transaction',
  disabled = false,
  className,
}: TransactionButtonWrapperProps) {
  const handleStatus = (status: LifecycleStatus) => {
    if (
      status.statusName === 'success' &&
      status.statusData &&
      'transactionReceipts' in status.statusData
    ) {
      const receipts = status.statusData.transactionReceipts as Array<{ transactionHash: string }>;
      if (receipts?.[0]) {
        onSuccess?.(receipts[0].transactionHash);
      }
    }
    if (status.statusName === 'error' && status.statusData) {
      const errorData = status.statusData as { message?: string };
      onError?.(new Error(errorData.message || 'Transaction failed'));
    }
  };

  return (
    <Transaction chainId={CHAIN.id} calls={calls} onStatus={handleStatus}>
      <TransactionButton text={buttonText} disabled={disabled} className={className} />
      <TransactionSponsor />
      <TransactionStatus>
        <TransactionStatusLabel />
        <TransactionStatusAction />
      </TransactionStatus>
    </Transaction>
  );
}
