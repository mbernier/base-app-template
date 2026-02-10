import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Input } from '@/components/ui/Input';

// ---------------------------------------------------------------------------
// No external mocks needed - Input uses only standard React APIs (useId,
// forwardRef) which are our own code. We test directly per project rules.
// ---------------------------------------------------------------------------

describe('Input', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Basic rendering
  // -------------------------------------------------------------------------
  it('renders an input element', () => {
    render(<Input />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Label
  // -------------------------------------------------------------------------
  it('shows label when provided', () => {
    render(<Input label="Email" />);

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('associates label with input via htmlFor/id when custom id is provided', () => {
    render(<Input label="Username" id="username-field" />);

    const input = screen.getByRole('textbox');
    const label = screen.getByText('Username');

    expect(input).toHaveAttribute('id', 'username-field');
    expect(label).toHaveAttribute('for', 'username-field');
  });

  it('does not render label when not provided', () => {
    const { container } = render(<Input />);

    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  it('shows error message with role="alert"', () => {
    render(<Input error="This field is required" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('This field is required');
  });

  it('sets aria-invalid="true" when error is present', () => {
    render(<Input error="Invalid email" />);

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-invalid="false" when no error', () => {
    render(<Input />);

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });

  it('sets aria-describedby to the error id when error is present', () => {
    render(<Input id="email" error="Bad email" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
  });

  // -------------------------------------------------------------------------
  // Helper text
  // -------------------------------------------------------------------------
  it('shows helperText when no error is present', () => {
    render(<Input helperText="Enter your email address" />);

    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('hides helperText when error is present', () => {
    render(<Input helperText="Enter your email" error="Required field" />);

    expect(screen.queryByText('Enter your email')).not.toBeInTheDocument();
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('sets aria-describedby to helper id when helperText is provided and no error', () => {
    render(<Input id="name" helperText="Your full name" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'name-helper');
  });

  // -------------------------------------------------------------------------
  // Ref forwarding
  // -------------------------------------------------------------------------
  it('forwards ref to the input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  // -------------------------------------------------------------------------
  // Error styling
  // -------------------------------------------------------------------------
  it('applies error border classes when error is present', () => {
    render(<Input error="Error!" />);

    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-red-300');
  });

  it('applies normal border classes when no error', () => {
    render(<Input />);

    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-gray-300');
  });
});
