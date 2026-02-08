/**
 * Mock for @coinbase/onchainkit/minikit
 *
 * - useMiniKit: Hook that provides mini-app context, readiness, and ready signal
 */
import { vi } from 'vitest';

export const useMiniKit = vi.fn(() => ({
  context: null as unknown,
  isMiniAppReady: false,
  setMiniAppReady: vi.fn(),
}));
