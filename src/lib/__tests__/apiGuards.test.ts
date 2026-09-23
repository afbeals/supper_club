import { describe, expect, it, vi } from 'vitest';
import type { SessionData } from '../auth';
import { getSession } from '../auth';
import { requireAdmin, requireUser } from '../apiGuards';

vi.mock('../auth', () => ({ getSession: vi.fn() }));

function session(role: SessionData['role']): SessionData {
  return { userId: 1, userName: 'Admin', userEmail: 'admin@example.com', role, avatarPath: null, token: 'tok' };
}

describe('requireUser', () => {
  it('returns a 401 error when there is no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const result = await requireUser();
    expect(result.session).toBeUndefined();
    expect(result.error?.status).toBe(401);
  });

  it('returns the session when signed in', async () => {
    vi.mocked(getSession).mockResolvedValue(session('WRITER'));
    const result = await requireUser();
    expect(result.error).toBeUndefined();
    expect(result.session?.role).toBe('WRITER');
  });
});

describe('requireAdmin', () => {
  it('returns a 401 error when there is no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const result = await requireAdmin();
    expect(result.error?.status).toBe(401);
  });

  it('returns a 403 error for a non-admin', async () => {
    vi.mocked(getSession).mockResolvedValue(session('WRITER'));
    const result = await requireAdmin();
    expect(result.session).toBeUndefined();
    expect(result.error?.status).toBe(403);
  });

  it('returns the session for an admin', async () => {
    vi.mocked(getSession).mockResolvedValue(session('ADMIN'));
    const result = await requireAdmin();
    expect(result.error).toBeUndefined();
    expect(result.session?.role).toBe('ADMIN');
  });
});
