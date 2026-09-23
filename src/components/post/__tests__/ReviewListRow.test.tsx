import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ReviewListRow } from '../ReviewListRow';

const post = {
  id: 1,
  slug: 'corner-bistro-review',
  title: 'Corner Bistro, revisited',
  summary: 'Still great, still loud.',
  author: { id: 1, name: 'Admin' },
  product: {
    id: 1,
    name: 'Corner Bistro',
    productType: { id: 2, name: 'Restaurant' },
  },
} as never;

describe('ReviewListRow', () => {
  it('renders the title as a link in row variant', () => {
    renderWithProviders(<ReviewListRow post={post} />);
    expect(screen.getByRole('link', { name: /Corner Bistro, revisited/ })).toBeInTheDocument();
  });

  it('shows the product type badge, product name, and summary in row variant', () => {
    renderWithProviders(<ReviewListRow post={post} />);
    expect(screen.getByText('Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Corner Bistro')).toBeInTheDocument();
    expect(screen.getByText('Still great, still loud.')).toBeInTheDocument();
  });

  // Card variant renders the whole row as one link (LinkCard), so the title
  // must be plain text, not another nested <a> — nesting two anchors is
  // invalid HTML and previously broke hydration and the card's layout.
  it('renders the title as plain text (not a nested link) in card variant', () => {
    renderWithProviders(<ReviewListRow post={post} variant="card" />);
    expect(screen.getByText('Corner Bistro, revisited')).toBeInTheDocument();
    // The whole card is one link (LinkCard) — the title must not ALSO be its
    // own nested anchor, which is invalid HTML and previously broke hydration.
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/posts/corner-bistro-review');
  });

  it('hides the category badge, product name, and summary when compact', () => {
    renderWithProviders(<ReviewListRow post={post} variant="card" compact />);
    expect(screen.queryByText('Restaurant')).not.toBeInTheDocument();
    expect(screen.queryByText('Corner Bistro')).not.toBeInTheDocument();
    expect(screen.queryByText('Still great, still loud.')).not.toBeInTheDocument();
    // The title and byline still show.
    expect(screen.getByText('Corner Bistro, revisited')).toBeInTheDocument();
    expect(screen.getByText('by Admin')).toBeInTheDocument();
  });

  it('renders trailing content when provided', () => {
    renderWithProviders(<ReviewListRow post={post} trailing={<span>74/100</span>} />);
    expect(screen.getByText('74/100')).toBeInTheDocument();
  });
});
