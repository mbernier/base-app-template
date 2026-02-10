import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { MintAnalytics } from '@/components/admin/MintAnalytics';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('MintAnalytics mock contract validation', () => {
  it('component is purely presentational and composes StatCard', () => {
    // MintAnalytics depends only on StatCard (no hooks to mock).
    // Validate that the component renders without errors.
    const { container } = render(
      <MintAnalytics totalMints={0} totalQuantity={0} uniqueMinters={0} />
    );
    expect(container.firstChild).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('MintAnalytics', () => {
  it('renders all three stat cards', () => {
    render(<MintAnalytics totalMints={100} totalQuantity={250} uniqueMinters={42} />);

    expect(screen.getByText('Total Mints')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Total Quantity')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('Unique Minters')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('handles zero values', () => {
    render(<MintAnalytics totalMints={0} totalQuantity={0} uniqueMinters={0} />);

    expect(screen.getByText('Total Mints')).toBeInTheDocument();
    expect(screen.getByText('Total Quantity')).toBeInTheDocument();
    expect(screen.getByText('Unique Minters')).toBeInTheDocument();
    // All three stat cards should show 0
    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(3);
  });

  it('handles large values', () => {
    render(<MintAnalytics totalMints={1000000} totalQuantity={5000000} uniqueMinters={100000} />);

    expect(screen.getByText('1000000')).toBeInTheDocument();
    expect(screen.getByText('5000000')).toBeInTheDocument();
    expect(screen.getByText('100000')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MintAnalytics
        totalMints={0}
        totalQuantity={0}
        uniqueMinters={0}
        className="analytics-custom"
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('analytics-custom');
  });

  it('renders in a grid layout', () => {
    const { container } = render(
      <MintAnalytics totalMints={1} totalQuantity={2} uniqueMinters={3} />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('grid');
    expect(wrapper.className).toContain('grid-cols-1');
    expect(wrapper.className).toContain('sm:grid-cols-3');
  });
});
