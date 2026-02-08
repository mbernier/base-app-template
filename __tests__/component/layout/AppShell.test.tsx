import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useFarcaster', () => ({
  useFarcasterContext: vi.fn(() => ({
    isMiniApp: false,
    isReady: false,
    context: null,
  })),
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock('@/components/layout/Footer', () => ({
  Footer: ({ className }: { className?: string }) => (
    <div data-testid="footer" className={className}>
      Footer
    </div>
  ),
}));

vi.mock('@/components/layout/MobileNav', () => ({
  MobileNav: ({ className }: { className?: string }) => (
    <div data-testid="mobile-nav" className={className}>
      MobileNav
    </div>
  ),
}));

import { useFarcasterContext } from '@/hooks/useFarcaster';
import { AppShell } from '@/components/layout/AppShell';

const mockUseFarcasterContext = vi.mocked(useFarcasterContext);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFarcasterContext.mockReturnValue({
      isMiniApp: false,
      isReady: false,
      context: null,
    });
  });

  // -------------------------------------------------------------------------
  // Standalone mode (isMiniApp = false)
  // -------------------------------------------------------------------------
  describe('standalone mode (isMiniApp=false)', () => {
    it('renders Header, Footer, and MobileNav', () => {
      render(
        <AppShell>
          <p>Page content</p>
        </AppShell>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
    });

    it('includes skip-to-content link with text "Skip to main content"', () => {
      render(
        <AppShell>
          <p>Page content</p>
        </AppShell>
      );

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink.tagName).toBe('A');
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('renders children inside main#main-content', () => {
      render(
        <AppShell>
          <p>Standalone child</p>
        </AppShell>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'main-content');
      expect(main).toHaveTextContent('Standalone child');
    });
  });

  // -------------------------------------------------------------------------
  // Mini-app mode (isMiniApp = true)
  // -------------------------------------------------------------------------
  describe('mini-app mode (isMiniApp=true)', () => {
    beforeEach(() => {
      mockUseFarcasterContext.mockReturnValue({
        isMiniApp: true,
        isReady: true,
        context: { user: { fid: 123 } } as unknown as ReturnType<
          typeof useFarcasterContext
        >['context'],
      });
    });

    it('does NOT render Header, Footer, or MobileNav', () => {
      render(
        <AppShell>
          <p>Mini-app content</p>
        </AppShell>
      );

      expect(screen.queryByTestId('header')).not.toBeInTheDocument();
      expect(screen.queryByTestId('footer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument();
    });

    it('applies safe area inset CSS custom properties', () => {
      const { container } = render(
        <AppShell>
          <p>Mini-app content</p>
        </AppShell>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.style.paddingTop).toBe('var(--ock-minikit-safe-area-inset-top, 0px)');
      expect(wrapper.style.paddingBottom).toBe(
        'var(--ock-minikit-safe-area-inset-bottom, 0px)'
      );
      expect(wrapper.style.paddingLeft).toBe('var(--ock-minikit-safe-area-inset-left, 0px)');
      expect(wrapper.style.paddingRight).toBe(
        'var(--ock-minikit-safe-area-inset-right, 0px)'
      );
    });

    it('renders children inside main#main-content', () => {
      render(
        <AppShell>
          <p>Mini-app child</p>
        </AppShell>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'main-content');
      expect(main).toHaveTextContent('Mini-app child');
    });
  });
});
