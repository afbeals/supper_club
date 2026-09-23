import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ProfileForm } from '../ProfileForm';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

beforeEach(() => {
  refresh.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProfileForm', () => {
  it('reflects typed bio text in the textarea', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm name="Sample Writer" initialBio="" initialAvatarPath={null} />);

    const textarea = screen.getByLabelText('Bio');
    await user.type(textarea, 'Loves ramen.');

    expect(textarea).toHaveValue('Loves ramen.');
  });

  it('saves the current bio and avatarPath via PATCH /api/profile', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderWithProviders(<ProfileForm name="Sample Writer" initialBio="Old bio" initialAvatarPath="avatars/1.jpg" />);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ bio: 'Old bio', avatarPath: 'avatars/1.jpg' }),
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });
});
