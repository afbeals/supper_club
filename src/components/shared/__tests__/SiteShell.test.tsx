import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SiteShell } from '../SiteShell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mantine's Menu positions its dropdown via Floating UI, whose `hide`
// middleware forces `display: none` under happy-dom regardless of open
// state (happy-dom does no real layout, so the reference/clipping-boundary
// geometry it measures never resolves as "visible"). That's a happy-dom/
// Floating-UI limitation, not something these tests are checking, so every
// menuitem query below passes `hidden: true` to query by role structurally
// instead of through the (here-unreliable) accessibility-visibility filter.
describe('SiteShell', () => {
  it('shows only a sign-in link when signed out', async () => {
    renderWithProviders(
      <SiteShell isSignedIn={false} userName={null} isAdmin={false} avatarPath={null}>
        <div>content</div>
      </SiteShell>,
    );
    expect(screen.queryByRole('link', { name: 'Add review' })).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByRole('menuitem', { name: 'Sign in', hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Dashboard', hidden: true })).not.toBeInTheDocument();
  });

  it('shows Add review and the account menu when signed in', async () => {
    renderWithProviders(
      <SiteShell isSignedIn userName="Sample Writer" isAdmin={false} avatarPath={null}>
        <div>content</div>
      </SiteShell>,
    );
    expect(screen.getByRole('link', { name: /Add review/ })).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByRole('menuitem', { name: 'Dashboard', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Profile', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sign out', hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Admin', hidden: true })).not.toBeInTheDocument();
  });

  it('only shows the Admin menu item for an admin', async () => {
    renderWithProviders(
      <SiteShell isSignedIn userName="Admin" isAdmin avatarPath={null}>
        <div>content</div>
      </SiteShell>,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByRole('menuitem', { name: 'Admin', hidden: true })).toBeInTheDocument();
  });

  it('abbreviates a two-part name to "First L." in the header', () => {
    renderWithProviders(
      <SiteShell isSignedIn userName="Sample Writer" isAdmin={false} avatarPath={null}>
        <div>content</div>
      </SiteShell>,
    );
    expect(screen.getByText('Sample W.')).toBeInTheDocument();
  });

  it('shows a single-word name as-is', () => {
    renderWithProviders(
      <SiteShell isSignedIn userName="Admin" isAdmin={false} avatarPath={null}>
        <div>content</div>
      </SiteShell>,
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders the page content passed as children', () => {
    renderWithProviders(
      <SiteShell isSignedIn={false} userName={null} isAdmin={false} avatarPath={null}>
        <div>the page body</div>
      </SiteShell>,
    );
    expect(screen.getByText('the page body')).toBeInTheDocument();
  });
});
