import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { CommentThread } from '../CommentThread';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

function comment(
  id: number,
  parentId: number | null,
  bodyText: string,
  authorName = 'Admin',
  authorId = 1,
) {
  return {
    id,
    postId: 1,
    authorId,
    parentId,
    bodyText,
    createdAt: new Date(2026, 0, id),
    deletedAt: null,
    author: { id: authorId, name: authorName },
  } as never;
}

describe('CommentThread', () => {
  beforeEach(() => {
    refresh.mockClear();
  });

  it('shows the comment count in the header', () => {
    renderWithProviders(
      <CommentThread postId={1} comments={[comment(1, null, 'Nice')]} currentUserId={null} />,
    );
    expect(screen.getByText('Comments (1)')).toBeInTheDocument();
  });

  it('shows no count and an empty state when there are no comments', () => {
    renderWithProviders(<CommentThread postId={1} comments={[]} currentUserId={null} />);
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('groups an arbitrarily deep reply chain under its top-level ancestor, all at one visual indent', () => {
    // 1 <- 2 <- 3 <- 4: a reply to a reply to a reply. A shallow (one-level)
    // grouping implementation would drop comment 4 entirely.
    const comments = [
      comment(1, null, 'top level'),
      comment(2, 1, 'a reply'),
      comment(3, 2, 'a reply to the reply'),
      comment(4, 3, 'a reply three deep'),
    ];
    renderWithProviders(<CommentThread postId={1} comments={comments} currentUserId={null} />);

    expect(screen.getByText('top level')).toBeInTheDocument();
    expect(screen.getByText('a reply')).toBeInTheDocument();
    expect(screen.getByText('a reply to the reply')).toBeInTheDocument();
    expect(screen.getByText('a reply three deep')).toBeInTheDocument();
    expect(screen.getByText('Comments (4)')).toBeInTheDocument();
  });

  it('shows a sign-in prompt instead of a composer when signed out', () => {
    renderWithProviders(<CommentThread postId={1} comments={[]} currentUserId={null} />);
    expect(screen.getByText('to leave a comment.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Add a comment')).not.toBeInTheDocument();
  });

  it('shows the composer and a Post button when signed in', () => {
    renderWithProviders(<CommentThread postId={1} comments={[]} currentUserId={1} />);
    expect(screen.getByPlaceholderText('Add a comment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post' })).toBeInTheDocument();
  });

  it('lets a signed-in user reply to a specific comment', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderWithProviders(
      <CommentThread postId={1} comments={[comment(1, null, 'top level')]} currentUserId={2} />,
    );

    await user.click(screen.getByRole('button', { name: 'Reply' }));
    // Two "Add a comment" textareas now exist: the top composer and this reply form.
    const replyTextarea = screen.getAllByPlaceholderText('Add a comment')[1]!;
    await user.type(replyTextarea, 'a reply');
    const replyPostButton = screen.getAllByRole('button', { name: 'Post' })[1]!;
    await user.click(replyPostButton);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/comments',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ postId: 1, parentId: 1, bodyText: 'a reply' }),
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('only shows a Delete button on the current user\'s own comment', () => {
    renderWithProviders(
      <CommentThread
        postId={1}
        comments={[comment(1, null, 'mine', 'Admin', 1), comment(2, null, 'theirs', 'Writer', 2)]}
        currentUserId={1}
      />,
    );

    const mine = within(screen.getByText('mine').closest('[class*="mantine-Paper-root"]') as HTMLElement);
    expect(mine.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    const theirs = within(screen.getByText('theirs').closest('[class*="mantine-Paper-root"]') as HTMLElement);
    expect(theirs.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
