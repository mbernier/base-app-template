import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    isLoading,
    className,
    variant,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    isLoading?: boolean;
    className?: string;
    variant?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={className}
      data-variant={variant}
      data-loading={isLoading}
      {...rest}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  ),
}));

import { ToSAcceptance, TOS_VERSION } from '@/components/legal/ToSAcceptance';
import { Button } from '@/components/ui/Button';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('Button mock contract validation', () => {
  it('mock renders a button with correct props', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled={false} variant="primary">
        Click me
      </Button>
    );
    const btn = screen.getByRole('button', { name: 'Click me' });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeEnabled();
  });

  it('mock disables button when isLoading is true', () => {
    render(
      <Button isLoading={true} variant="primary">
        Submit
      </Button>
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('ToSAcceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch globally
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('exports TOS_VERSION constant', () => {
    expect(TOS_VERSION).toBe('1.0.0');
  });

  it('renders as a dialog with correct accessibility attributes', () => {
    render(<ToSAcceptance onAccept={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'tos-title');
  });

  it('renders "Terms of Service" heading', () => {
    render(<ToSAcceptance onAccept={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
  });

  it('renders terms content with list items', () => {
    render(<ToSAcceptance onAccept={vi.fn()} />);

    expect(
      screen.getByText(/By using this application, you agree to the following/)
    ).toBeInTheDocument();
    expect(screen.getByText(/You use this application at your own risk/)).toBeInTheDocument();
    expect(screen.getByText(/Cryptocurrency transactions are irreversible/)).toBeInTheDocument();
  });

  it('renders checkbox that is unchecked by default', () => {
    render(<ToSAcceptance onAccept={vi.fn()} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('has accept button disabled when checkbox is unchecked', () => {
    render(<ToSAcceptance onAccept={vi.fn()} />);

    // The button text is "Accept & Continue" (rendered with &amp;)
    const acceptBtn = screen.getByRole('button', { name: /Accept/ });
    expect(acceptBtn).toBeDisabled();
  });

  it('enables accept button when checkbox is checked', async () => {
    const user = userEvent.setup();

    render(<ToSAcceptance onAccept={vi.fn()} />);

    await user.click(screen.getByRole('checkbox'));

    const acceptBtn = screen.getByRole('button', { name: /Accept/ });
    expect(acceptBtn).toBeEnabled();
  });

  it('calls fetch and onAccept when accept button is clicked', async () => {
    const onAccept = vi.fn();
    const user = userEvent.setup();

    render(<ToSAcceptance onAccept={onAccept} />);

    // Check the checkbox first
    await user.click(screen.getByRole('checkbox'));

    // Click accept
    await user.click(screen.getByRole('button', { name: /Accept/ }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/accept-tos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: TOS_VERSION }),
      });
    });

    await waitFor(() => {
      expect(onAccept).toHaveBeenCalledTimes(1);
    });
  });

  it('renders decline button when onDecline is provided', () => {
    render(<ToSAcceptance onAccept={vi.fn()} onDecline={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('does not render decline button when onDecline is not provided', () => {
    render(<ToSAcceptance onAccept={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });

  it('calls onDecline when decline button is clicked', async () => {
    const onDecline = vi.fn();
    const user = userEvent.setup();

    render(<ToSAcceptance onAccept={vi.fn()} onDecline={onDecline} />);

    await user.click(screen.getByRole('button', { name: 'Decline' }));

    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('renders links to Terms of Service and Privacy Policy', () => {
    render(<ToSAcceptance onAccept={vi.fn()} />);

    const tosLink = screen.getByRole('link', { name: 'Terms of Service' });
    expect(tosLink).toHaveAttribute('href', '/terms');
    expect(tosLink).toHaveAttribute('target', '_blank');

    const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(privacyLink).toHaveAttribute('href', '/privacy');
    expect(privacyLink).toHaveAttribute('target', '_blank');
  });
});
