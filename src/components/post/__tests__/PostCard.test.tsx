import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PostCard } from '../PostCard';

function makePost(productTypeId: number, summary: string) {
  return {
    id: 1,
    slug: 'corner-bistro-review',
    title: 'Corner Bistro, revisited',
    summary,
    author: { name: 'Admin' },
    product: { name: 'Corner Bistro', productType: { id: productTypeId, name: 'Restaurant' } },
  } as never;
}

describe('PostCard', () => {
  it('renders the summary when present', () => {
    renderWithProviders(<PostCard post={makePost(2, 'Still great, still loud.')} />);
    expect(screen.getByText('Still great, still loud.')).toBeInTheDocument();
  });

  it('renders no summary text when the post has none', () => {
    renderWithProviders(<PostCard post={makePost(2, '')} />);
    expect(screen.queryByText('Still great, still loud.')).not.toBeInTheDocument();
  });

  it('cycles the category chip color by productType id', () => {
    const { container: even } = renderWithProviders(<PostCard post={makePost(2, '')} />);
    const { container: odd } = renderWithProviders(<PostCard post={makePost(3, '')} />);

    const evenBadge = even.querySelector('.mantine-Badge-root') as HTMLElement;
    const oddBadge = odd.querySelector('.mantine-Badge-root') as HTMLElement;

    expect(evenBadge.getAttribute('style')).toContain('coral');
    expect(oddBadge.getAttribute('style')).toContain('sage');
  });
});
