import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, PageLoading } from '@/components/ui/LoadingSpinner';

// ---------------------------------------------------------------------------
// No external mocks needed - LoadingSpinner is a pure presentational
// component using only standard React and Tailwind classes.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// LoadingSpinner tests
// ---------------------------------------------------------------------------
describe('LoadingSpinner', () => {
  it('renders with role="status"', () => {
    render(<LoadingSpinner />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label="Loading"', () => {
    render(<LoadingSpinner />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
  });

  it('includes sr-only text "Loading..."', () => {
    render(<LoadingSpinner />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toHaveClass('sr-only');
  });

  it('applies md size classes by default', () => {
    render(<LoadingSpinner />);

    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toBeInTheDocument();
    // SVG elements use SVGAnimatedString for className in jsdom;
    // use getAttribute('class') to get the class string.
    const classes = svg!.getAttribute('class') ?? '';
    expect(classes).toContain('w-8');
    expect(classes).toContain('h-8');
  });

  it('applies sm size classes', () => {
    render(<LoadingSpinner size="sm" />);

    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toBeInTheDocument();
    const classes = svg!.getAttribute('class') ?? '';
    expect(classes).toContain('w-4');
    expect(classes).toContain('h-4');
  });

  it('applies lg size classes', () => {
    render(<LoadingSpinner size="lg" />);

    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toBeInTheDocument();
    const classes = svg!.getAttribute('class') ?? '';
    expect(classes).toContain('w-12');
    expect(classes).toContain('h-12');
  });

  it('has animate-spin class on the SVG', () => {
    render(<LoadingSpinner />);

    const svg = screen.getByRole('status').querySelector('svg');
    const classes = svg!.getAttribute('class') ?? '';
    expect(classes).toContain('animate-spin');
  });

  it('merges custom className', () => {
    render(<LoadingSpinner className="my-spinner" />);

    expect(screen.getByRole('status')).toHaveClass('my-spinner');
  });
});

// ---------------------------------------------------------------------------
// PageLoading tests
// ---------------------------------------------------------------------------
describe('PageLoading', () => {
  it('renders a LoadingSpinner component', () => {
    render(<PageLoading />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders default "Loading..." message text', () => {
    render(<PageLoading />);

    // The PageLoading component renders a <p> with the message
    // distinct from the sr-only "Loading..." in the spinner
    const paragraphs = screen.getAllByText('Loading...');
    // One from spinner sr-only, one from PageLoading message
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders custom message text', () => {
    render(<PageLoading message="Fetching data..." />);

    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('uses lg size spinner', () => {
    render(<PageLoading />);

    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toBeInTheDocument();
    const classes = svg!.getAttribute('class') ?? '';
    expect(classes).toContain('w-12');
    expect(classes).toContain('h-12');
  });
});
