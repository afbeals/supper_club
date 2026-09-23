import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PostForm } from '../PostForm';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// The rich text body editor is tiptap/ProseMirror, unrelated to what these
// tests cover (bullets, subitems, the product filter) and not something
// happy-dom needs to actually exercise here.
vi.mock('@/components/shared/RichTextEditorField', () => ({
  RichTextEditorField: () => null,
}));

const products = [
  { id: 1, name: 'Project Hail Mary', subtitle: '', productType: { id: 10, name: 'Book', criteria: [] } },
  { id: 2, name: 'Corner Bistro', subtitle: '', productType: { id: 20, name: 'Restaurant', criteria: [] } },
];
const productTypes = [{ id: 10, name: 'Book' }, { id: 20, name: 'Restaurant' }];

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products, productTypes }) }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PostForm', () => {
  it('adds and removes pro and con bullets', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostForm />);

    await user.click(screen.getByRole('button', { name: 'Add pro' }));
    await user.click(screen.getByRole('button', { name: 'Add con' }));
    expect(screen.getAllByPlaceholderText('e.g. Fast and reliable')).toHaveLength(2);

    const firstBullet = screen.getAllByPlaceholderText('e.g. Fast and reliable')[0]!;
    const firstRow = firstBullet.closest('[class*="mantine-Group-root"]') as HTMLElement;
    await user.click(within(firstRow).getByRole('button'));

    expect(screen.getAllByPlaceholderText('e.g. Fast and reliable')).toHaveLength(1);
  });

  it('adds and removes chapter/item subitems', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostForm />);

    await user.click(screen.getByRole('button', { name: 'Add chapter / item' }));
    await user.click(screen.getByRole('button', { name: 'Add chapter / item' }));
    expect(screen.getAllByPlaceholderText('Chapter 3 / Duck confit')).toHaveLength(2);

    const firstLabel = screen.getAllByPlaceholderText('Chapter 3 / Duck confit')[0]!;
    const firstSubitem = firstLabel.closest('[class*="mantine-Paper-root"]') as HTMLElement;
    await user.click(within(firstSubitem).getByRole('button'));

    expect(screen.getAllByPlaceholderText('Chapter 3 / Duck confit')).toHaveLength(1);
  });

  it("filters the product list by name only, not the product type suffix", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostForm />);

    const input = await screen.findByPlaceholderText('Pick a product');
    await user.click(input);
    await user.type(input, 'restaurant');
    expect(screen.queryByRole('option', { name: /Corner Bistro/, hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Project Hail Mary/, hidden: true })).not.toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'corner');
    expect(screen.getByRole('option', { name: /Corner Bistro/, hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Project Hail Mary/, hidden: true })).not.toBeInTheDocument();
  });
});
