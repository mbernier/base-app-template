import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { StatCard } from '@/components/admin/StatCard';

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="Total Mints" value={42} />);

    expect(screen.getByText('Total Mints')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<StatCard label="Users" value={10} className="my-custom-class" />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('my-custom-class');
  });

  it('handles string values', () => {
    render(<StatCard label="Revenue" value="$1,234" />);

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$1,234')).toBeInTheDocument();
  });

  it('handles zero value', () => {
    render(<StatCard label="Errors" value={0} />);

    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders without optional className', () => {
    const { container } = render(<StatCard label="Items" value={5} />);

    const card = container.firstChild as HTMLElement;
    // Should not have trailing space issues from undefined className
    expect(card.className).toContain('bg-white');
    expect(card.className).toContain('rounded-xl');
  });
});
