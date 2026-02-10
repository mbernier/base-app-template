import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks - only external 3rd-party modules (lucide-react)
// ---------------------------------------------------------------------------
vi.mock('lucide-react', () => ({
  CheckCircle: (props: React.ComponentProps<'span'>) => (
    <span data-testid="icon-check-circle" {...props} />
  ),
  AlertCircle: (props: React.ComponentProps<'span'>) => (
    <span data-testid="icon-alert-circle" {...props} />
  ),
  AlertTriangle: (props: React.ComponentProps<'span'>) => (
    <span data-testid="icon-alert-triangle" {...props} />
  ),
  Info: (props: React.ComponentProps<'span'>) => <span data-testid="icon-info" {...props} />,
  X: (props: React.ComponentProps<'span'>) => <span data-testid="icon-x" {...props} />,
}));

import { Toast, ToastContainer } from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('lucide-react mock contract validation', () => {
  it('all mocked icon components render correctly', () => {
    render(<Toast message="Test" type="success" onClose={() => {}} />);

    expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
    expect(screen.getByTestId('icon-x')).toBeInTheDocument();
  });

  it('each toast type renders its corresponding icon', () => {
    const onClose = vi.fn();

    const { rerender } = render(<Toast message="Success" type="success" onClose={onClose} />);
    expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();

    rerender(<Toast message="Error" type="error" onClose={onClose} />);
    expect(screen.getByTestId('icon-alert-circle')).toBeInTheDocument();

    rerender(<Toast message="Warning" type="warning" onClose={onClose} />);
    expect(screen.getByTestId('icon-alert-triangle')).toBeInTheDocument();

    rerender(<Toast message="Info" type="info" onClose={onClose} />);
    expect(screen.getByTestId('icon-info')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Toast component tests
// ---------------------------------------------------------------------------
describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Basic rendering
  // -------------------------------------------------------------------------
  it('renders message text', () => {
    render(<Toast message="Operation successful" type="success" onClose={() => {}} />);

    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Accessibility
  // -------------------------------------------------------------------------
  it('has role="alert" and aria-live="polite"', () => {
    render(<Toast message="Alert message" onClose={() => {}} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  // -------------------------------------------------------------------------
  // Close button
  // -------------------------------------------------------------------------
  it('shows close button with aria-label="Dismiss notification"', () => {
    render(<Toast message="Dismissable" onClose={() => {}} />);

    const closeButton = screen.getByLabelText('Dismiss notification');
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose after animation delay when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Toast message="Close me" onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Dismiss notification'));

    // onClose is called after a 300ms animation delay
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Auto-dismiss
  // -------------------------------------------------------------------------
  it('auto-dismisses after the specified duration', () => {
    const onClose = vi.fn();
    render(<Toast message="Auto dismiss" duration={3000} onClose={onClose} />);

    // Before duration elapses
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(onClose).not.toHaveBeenCalled();

    // After duration elapses - triggers setIsVisible(false)
    act(() => {
      vi.advanceTimersByTime(1);
    });

    // Then the 300ms animation delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses default duration of 5000ms', () => {
    const onClose = vi.fn();
    render(<Toast message="Default duration" onClose={onClose} />);

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Type-based styling
  // -------------------------------------------------------------------------
  it('applies success styling classes', () => {
    render(<Toast message="Success" type="success" onClose={() => {}} />);

    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-green-50');
    expect(alert.className).toContain('border-green-200');
  });

  it('applies error styling classes', () => {
    render(<Toast message="Error" type="error" onClose={() => {}} />);

    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-red-50');
    expect(alert.className).toContain('border-red-200');
  });

  it('defaults to info type when type is not provided', () => {
    render(<Toast message="Default type" onClose={() => {}} />);

    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-blue-50');
    expect(alert.className).toContain('border-blue-200');
  });
});

// ---------------------------------------------------------------------------
// ToastContainer tests
// ---------------------------------------------------------------------------
describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders multiple toasts', () => {
    const toasts = [
      { id: '1', message: 'First toast', type: 'success' as const },
      { id: '2', message: 'Second toast', type: 'error' as const },
      { id: '3', message: 'Third toast', type: 'info' as const },
    ];
    const onRemove = vi.fn();

    render(<ToastContainer toasts={toasts} onRemove={onRemove} />);

    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
    expect(screen.getByText('Third toast')).toBeInTheDocument();
  });

  it('renders empty container when no toasts', () => {
    const { container } = render(<ToastContainer toasts={[]} onRemove={() => {}} />);

    // Container should exist but have no toast children
    const alerts = container.querySelectorAll('[role="alert"]');
    expect(alerts).toHaveLength(0);
  });

  it('passes onRemove with toast id to each Toast onClose', () => {
    const onRemove = vi.fn();
    const toasts = [{ id: 'toast-1', message: 'Removable', type: 'info' as const }];

    render(<ToastContainer toasts={toasts} onRemove={onRemove} />);

    // Click dismiss on the toast
    fireEvent.click(screen.getByLabelText('Dismiss notification'));

    // Wait for animation delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onRemove).toHaveBeenCalledWith('toast-1');
  });
});
