import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { Button } from '@/components/ui/Button';

// ---------------------------------------------------------------------------
// No external mocks needed - Button uses only @/lib/utils (cn) which is
// our own code and per project rules we test it directly, not mock it.
// ---------------------------------------------------------------------------

describe('Button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Basic rendering
  // -------------------------------------------------------------------------
  it('renders children text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Variant classes
  // -------------------------------------------------------------------------
  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);

    const button = screen.getByRole('button', { name: 'Primary' });
    expect(button.className).toContain('bg-blue-600');
    expect(button.className).toContain('text-white');
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);

    const button = screen.getByRole('button', { name: 'Secondary' });
    expect(button.className).toContain('bg-gray-100');
    expect(button.className).toContain('text-gray-900');
  });

  it('applies outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>);

    const button = screen.getByRole('button', { name: 'Outline' });
    expect(button.className).toContain('border');
    expect(button.className).toContain('border-gray-300');
    expect(button.className).toContain('text-gray-700');
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);

    const button = screen.getByRole('button', { name: 'Ghost' });
    expect(button.className).toContain('text-gray-600');
  });

  // -------------------------------------------------------------------------
  // Size classes
  // -------------------------------------------------------------------------
  it('applies md size classes by default', () => {
    render(<Button>Medium</Button>);

    const button = screen.getByRole('button', { name: 'Medium' });
    expect(button.className).toContain('px-4');
    expect(button.className).toContain('py-2');
    expect(button.className).toContain('text-base');
  });

  it('applies sm size classes', () => {
    render(<Button size="sm">Small</Button>);

    const button = screen.getByRole('button', { name: 'Small' });
    expect(button.className).toContain('px-3');
    expect(button.className).toContain('py-1.5');
    expect(button.className).toContain('text-sm');
  });

  it('applies lg size classes', () => {
    render(<Button size="lg">Large</Button>);

    const button = screen.getByRole('button', { name: 'Large' });
    expect(button.className).toContain('px-6');
    expect(button.className).toContain('py-3');
    expect(button.className).toContain('text-lg');
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  it('shows spinner SVG when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);

    const button = screen.getByRole('button', { name: 'Loading' });
    const svg = button.querySelector('svg.animate-spin');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('disables button when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);

    expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled();
  });

  it('does not show spinner SVG when isLoading is false', () => {
    render(<Button>Normal</Button>);

    const button = screen.getByRole('button', { name: 'Normal' });
    const svg = button.querySelector('svg.animate-spin');
    expect(svg).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Disabled state
  // -------------------------------------------------------------------------
  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Ref forwarding
  // -------------------------------------------------------------------------
  it('forwards ref to the button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Test</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('Ref Test');
  });

  // -------------------------------------------------------------------------
  // Event handling
  // -------------------------------------------------------------------------
  it('fires onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Clickable' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        No Click
      </Button>
    );

    fireEvent.click(screen.getByRole('button', { name: 'No Click' }));

    expect(handleClick).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Custom className
  // -------------------------------------------------------------------------
  it('merges custom className via cn()', () => {
    render(<Button className="my-custom-class">Custom</Button>);

    const button = screen.getByRole('button', { name: 'Custom' });
    expect(button.className).toContain('my-custom-class');
    // Should still have base styles
    expect(button.className).toContain('inline-flex');
  });
});
