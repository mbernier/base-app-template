'use client';

import {
  Transaction,
  TransactionButton,
  TransactionSponsor,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
  type LifecycleStatus,
} from '@coinbase/onchainkit/transaction';
import type { ContractFunctionParameters } from 'viem';
import { CHAIN } from '@/lib/tokens';

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
