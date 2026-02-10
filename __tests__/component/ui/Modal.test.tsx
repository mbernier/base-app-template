import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks - only external 3rd-party modules
// ---------------------------------------------------------------------------
vi.mock('lucide-react', () => ({
  X: (props: React.ComponentProps<'span'>) => <span data-testid="x-icon" {...props} />,
}));

import { Modal } from '@/components/ui/Modal';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('lucide-react mock contract validation', () => {
  it('X icon mock renders as a span with data-testid', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Test">
        Content
      </Modal>
    );

    const icons = screen.getAllByTestId('x-icon');
    expect(icons.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body overflow before each test
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Ensure body overflow is cleaned up
    document.body.style.overflow = '';
  });

  // -------------------------------------------------------------------------
  // Visibility
  // -------------------------------------------------------------------------
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>
        Hidden content
      </Modal>
    );

    expect(container.innerHTML).toBe('');
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('renders content when isOpen is true', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Title
  // -------------------------------------------------------------------------
  it('shows title when provided', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('renders close button even without title', () => {
    render(
      <Modal isOpen onClose={defaultProps.onClose}>
        <p>No title content</p>
      </Modal>
    );

    expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    expect(screen.getByText('No title content')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Accessibility attributes
  // -------------------------------------------------------------------------
  it('has role="dialog" and aria-modal="true"', () => {
    render(<Modal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('sets aria-labelledby when title is provided', () => {
    render(<Modal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    const labelledby = dialog.getAttribute('aria-labelledby');
    expect(labelledby).toBeTruthy();

    // The h2 title should have the matching id
    const heading = screen.getByText('Test Modal');
    expect(heading.id).toBe(labelledby);
  });

  it('does not set aria-labelledby when title is absent', () => {
    render(
      <Modal isOpen onClose={() => {}}>
        No title
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });

  // -------------------------------------------------------------------------
  // Close behavior
  // -------------------------------------------------------------------------
  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Escape Test">
        Content
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Close Btn Test">
        Content
      </Modal>
    );

    fireEvent.click(screen.getByLabelText('Close modal'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay/backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Overlay Test">
        Content
      </Modal>
    );

    // The overlay is the div with aria-hidden="true" inside the dialog wrapper
    const overlay = screen.getByRole('dialog').querySelector('[aria-hidden="true"]');
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Body overflow management
  // -------------------------------------------------------------------------
  it('sets body overflow to hidden when open', () => {
    render(<Modal {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body overflow when closed', () => {
    const { rerender } = render(<Modal {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal isOpen={false} onClose={defaultProps.onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('');
  });

  it('cleans up body overflow on unmount', () => {
    const { unmount } = render(<Modal {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('');
  });

  // -------------------------------------------------------------------------
  // Custom className
  // -------------------------------------------------------------------------
  it('merges custom className on modal panel', () => {
    render(<Modal {...defaultProps} className="custom-modal-class" />);

    // The modal panel is the div with tabIndex -1 inside the dialog
    const dialog = screen.getByRole('dialog');
    const panel = dialog.querySelector('[tabindex="-1"]');
    expect(panel).toBeInTheDocument();
    expect(panel!.className).toContain('custom-modal-class');
  });
});
