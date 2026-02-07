/**
 * Mock for next/navigation hooks used by components.
 */
import { vi } from 'vitest';

export const useRouter = vi.fn().mockReturnValue({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
});

export const usePathname = vi.fn().mockReturnValue('/');

export const useSearchParams = vi.fn().mockReturnValue(new URLSearchParams());

export const useParams = vi.fn().mockReturnValue({});

export const redirect = vi.fn();
