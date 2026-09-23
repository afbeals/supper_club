import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ProductCompareSelector } from '../ProductCompareSelector';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

function makePost(id: number, title: string, authorName: string) {
  return {
    id,
    slug: `post-${id}`,
    title,
    summary: '',
    author: { id, name: authorName },
    product: { id: 1, name: 'Tanoshii Ramen', productType: { id: 2, name: 'Restaurant' } },
  };
}

const postA = makePost(38, 'Worth the wait, but ask for the spicy miso', 'Admin');
const postB = makePost(39, 'Great broth, chaotic front-of-house', 'Sample Writer');
const posts = [postA, postB] as never;
const onlyPostA = [postA] as never;

describe('ProductCompareSelector', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('does not render compare buttons when there is only one review', () => {
    renderWithProviders(<ProductCompareSelector posts={onlyPostA} productSlug="tanoshii-ramen" scores={{}} />);
    expect(screen.queryByRole('button', { name: /Compare/ })).not.toBeInTheDocument();
  });

  it('shows a "1 review ready" panel after selecting one review', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCompareSelector posts={posts} productSlug="tanoshii-ramen" scores={{}} />);

    await user.click(screen.getByRole('button', { name: new RegExp(`Compare ${postA.title}`) }));

    expect(screen.getByText('1 review ready')).toBeInTheDocument();
    // The title now appears twice — once on its own card, once in the panel.
    expect(screen.getAllByText(postA.title, { exact: false })).toHaveLength(2);
    expect(push).not.toHaveBeenCalled();
  });

  it('navigates to the compare page once a second review is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCompareSelector posts={posts} productSlug="tanoshii-ramen" scores={{}} />);

    await user.click(screen.getByRole('button', { name: new RegExp(`Compare ${postA.title}`) }));
    await user.click(screen.getByRole('button', { name: new RegExp(`Compare ${postB.title}`) }));

    expect(push).toHaveBeenCalledWith('/products/tanoshii-ramen/compare?posts=38,39');
  });

  it('deselects a review when its compare button is clicked again, without navigating', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCompareSelector posts={posts} productSlug="tanoshii-ramen" scores={{}} />);

    await user.click(screen.getByRole('button', { name: new RegExp(`Compare ${postA.title}`) }));
    expect(screen.getByText('1 review ready')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: new RegExp(`Remove ${postA.title}`) }));
    expect(screen.queryByText('1 review ready')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('clears the selection when the panel is dismissed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCompareSelector posts={posts} productSlug="tanoshii-ramen" scores={{}} />);

    await user.click(screen.getByRole('button', { name: new RegExp(`Compare ${postA.title}`) }));
    await user.click(screen.getByRole('button', { name: 'Cancel compare selection' }));

    expect(screen.queryByText('1 review ready')).not.toBeInTheDocument();
  });

  it('shows the score badge only for a post that has one', () => {
    renderWithProviders(
      <ProductCompareSelector posts={posts} productSlug="tanoshii-ramen" scores={{ 38: 74, 39: null }} />,
    );
    expect(screen.getByText('74/100')).toBeInTheDocument();
    expect(screen.queryByText('null/100')).not.toBeInTheDocument();
  });
});
