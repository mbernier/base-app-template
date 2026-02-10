import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children?: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/config', () => ({
  app: { name: 'Test App', url: 'http://localhost:3100' },
}));

import { Footer } from '@/components/layout/Footer';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('Footer mock contract validation', () => {
  it('next/link mock renders as anchor element with href', () => {
    render(<Footer />);
    const termsLink = screen.getByText('Terms of Service');
    expect(termsLink.tagName).toBe('A');
    expect(termsLink).toHaveAttribute('href', '/terms');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('Footer', () => {
  it('shows copyright text with current year and app name', () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`${currentYear} Test App. All rights reserved.`)).toBeInTheDocument();
  });

  it('shows Terms of Service link pointing to /terms', () => {
    render(<Footer />);

    const termsLink = screen.getByText('Terms of Service');
    expect(termsLink).toBeInTheDocument();
    expect(termsLink.closest('a')).toHaveAttribute('href', '/terms');
  });

  it('shows Privacy Policy link pointing to /privacy', () => {
    render(<Footer />);

    const privacyLink = screen.getByText('Privacy Policy');
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy');
  });

  it('has a footer navigation with aria-label "Footer navigation"', () => {
    render(<Footer />);

    expect(screen.getByRole('navigation', { name: 'Footer navigation' })).toBeInTheDocument();
  });

  it('accepts and applies className prop', () => {
    const { container } = render(<Footer className="custom-class" />);

    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('custom-class');
  });
});
