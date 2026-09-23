import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AvatarUpload } from '../AvatarUpload';

describe('AvatarUpload', () => {
  it('shows the name initial and no Remove button when there is no avatar', () => {
    renderWithProviders(<AvatarUpload name="Sample Writer" avatarPath={null} onChange={vi.fn()} />);
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('shows a Remove button when an avatar is set, and clears it via onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<AvatarUpload name="Sample Writer" avatarPath="avatars/1.jpg" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
