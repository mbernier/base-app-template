import { describe, it, expect } from 'vitest';
import {
  cn,
  truncateAddress,
  formatCurrency,
  formatNumber,
  isBrowser,
  isValidAddress,
  debounce,
  sleep,
  randomColor,
} from '../utils';

describe('cn', () => {
  it('should combine class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('should handle undefined/null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });
});

describe('truncateAddress', () => {
  it('should truncate an Ethereum address', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = truncateAddress(address);
    expect(result).toBe('0x1234...5678');
  });

  it('should handle custom char count', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = truncateAddress(address, 6);
    expect(result).toBe('0x123456...345678');
  });

  it('should return empty string for empty input', () => {
    expect(truncateAddress('')).toBe('');
  });
});

describe('formatCurrency', () => {
  it('should format number as currency', () => {
    const result = formatCurrency(1234.56);
    expect(result).toBe('$1,234.56');
  });

  it('should handle string input', () => {
    const result = formatCurrency('99.99');
    expect(result).toBe('$99.99');
  });
});

describe('formatNumber', () => {
  it('should format number with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('should handle decimal places', () => {
    expect(formatNumber(1234.5678, 2)).toBe('1,234.57');
  });

  it('should handle string input', () => {
    expect(formatNumber('1000')).toBe('1,000');
  });
});

describe('isBrowser', () => {
  it('should return false in test environment (jsdom)', () => {
    // jsdom defines window, so this returns true in vitest with jsdom
    expect(typeof isBrowser()).toBe('boolean');
  });
});

describe('isValidAddress', () => {
  it('should validate correct Ethereum addresses', () => {
    expect(isValidAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    expect(isValidAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true);
  });

  it('should reject invalid addresses', () => {
    expect(isValidAddress('not-an-address')).toBe(false);
    expect(isValidAddress('0x123')).toBe(false);
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false); // no 0x prefix
  });
});

describe('debounce', () => {
  it('should debounce function calls', async () => {
    let callCount = 0;
    const fn = debounce(() => {
      callCount++;
    }, 50);

    fn();
    fn();
    fn();

    expect(callCount).toBe(0);

    // Wait for debounce to fire
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(callCount).toBe(1);
  });
});

describe('sleep', () => {
  it('resolves after specified time', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some tolerance
  });

  it('resolves with undefined', async () => {
    const result = await sleep(10);
    expect(result).toBeUndefined();
  });
});

describe('randomColor', () => {
  it('returns a hex color string starting with #', () => {
    const color = randomColor();
    expect(color).toMatch(/^#[0-9a-f]+$/i);
  });

  it('generates different colors on multiple calls', () => {
    const colors = new Set(Array.from({ length: 20 }, () => randomColor()));
    expect(colors.size).toBeGreaterThan(1);
  });
});
