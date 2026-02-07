import { type ClassValue, clsx } from 'clsx';

// Utility for combining class names
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// Truncate address for display
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Format currency
export function formatCurrency(
  amount: number | string,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(numAmount);
}

// Format number with commas
export function formatNumber(num: number | string, decimals?: number): string {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (decimals !== undefined) {
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return numValue.toLocaleString('en-US');
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Check if running in browser
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Generate a random hex color
export function randomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Validate Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
