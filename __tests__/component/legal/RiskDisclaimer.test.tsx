import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
// Mock only the specific icons used by RiskDisclaimer
vi.mock('lucide-react', () => ({
  AlertTriangle: (props: Record<string, unknown>) => (
    <span data-testid="icon-AlertTriangle" {...props} />
  ),
  X: (props: Record<string, unknown>) => <span data-testid="icon-X" {...props} />,
}));

import { AlertTriangle, X } from 'lucide-react';
import { RiskDisclaimer, RiskDisclaimerCompact } from '@/components/legal/RiskDisclaimer';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('lucide-react mock contract validation', () => {
  it('mock renders AlertTriangle icon component with data-testid', () => {
    const { container } = render(<AlertTriangle className="w-5 h-5" />);
    const icon = container.querySelector('[data-testid="icon-AlertTriangle"]');
    expect(icon).toBeTruthy();
  });

  it('mock renders X icon component with data-testid', () => {
    const { container } = render(<X className="w-4 h-4" />);
    const icon = container.querySelector('[data-testid="icon-X"]');
    expect(icon).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// RiskDisclaimer tests
// ---------------------------------------------------------------------------
describe('RiskDisclaimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with role="alert"', () => {
    render(<RiskDisclaimer />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows risk warning heading', () => {
    render(<RiskDisclaimer />);

    expect(screen.getByText('Risk Warning')).toBeInTheDocument();
  });

  it('shows risk warning body text', () => {
    render(<RiskDisclaimer />);

    expect(
      screen.getByText(/Cryptocurrency investments carry significant risk/)
    ).toBeInTheDocument();
  });

  it('shows dismiss button when onDismiss is provided', () => {
    render(<RiskDisclaimer onDismiss={() => {}} />);

    expect(screen.getByRole('button', { name: 'Dismiss warning' })).toBeInTheDocument();
  });

  it('does not show dismiss button when onDismiss is not provided', () => {
    render(<RiskDisclaimer />);

    expect(screen.queryByRole('button', { name: 'Dismiss warning' })).not.toBeInTheDocument();
  });

  it('hides the component and calls onDismiss when dismiss is clicked', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(<RiskDisclaimer onDismiss={onDismiss} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss warning' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// RiskDisclaimerCompact tests
// ---------------------------------------------------------------------------
describe('RiskDisclaimerCompact', () => {
  it('renders compact warning text', () => {
    render(<RiskDisclaimerCompact />);

    expect(
      screen.getByText(/Crypto investments carry risk\. Not financial advice\./)
    ).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<RiskDisclaimerCompact className="mt-4" />);

    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('mt-4');
  });
});
