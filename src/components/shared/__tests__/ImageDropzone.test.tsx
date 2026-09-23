import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ImageDropzone, type UploadedImage } from '../ImageDropzone';

function image(path: string): UploadedImage {
  return { path, thumbPath: `${path}-thumb`, width: 100, height: 100, mimeType: 'image/jpeg', byteSize: 1000 };
}

describe('ImageDropzone', () => {
  it('renders no images when the value is empty', () => {
    const { container } = renderWithProviders(<ImageDropzone value={[]} onChange={vi.fn()} />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('renders each existing image', () => {
    // These images have alt="" (decorative), which gives them an implicit
    // "presentation" role, not "img" — so querying by role won't find them.
    const { container } = renderWithProviders(
      <ImageDropzone value={[image('a.jpg'), image('b.jpg')]} onChange={vi.fn()} />,
    );
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('removes only the clicked image via onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ImageDropzone value={[image('a.jpg'), image('b.jpg')]} onChange={onChange} />);

    await user.click(screen.getAllByRole('button', { name: 'Remove image' })[0]!);

    expect(onChange).toHaveBeenCalledWith([image('b.jpg')]);
  });
});
