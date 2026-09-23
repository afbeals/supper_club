'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Comment } from '@prisma/client';
import { Avatar, Button, Group, Paper, Stack, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { relativeTime } from '@/lib/format';
import { LinkText } from '@/components/shared/LinkText';

// Only the fields the UI displays — never the full User row (passwordHash
// included) — since this is a client component and any prop here gets
// serialized into the page's RSC payload, visible in page source.
type CommentAuthor = { id: number; name: string };
type CommentWithAuthor = Comment & { author: CommentAuthor };

// A reply can itself have replies (the API and schema allow parentId to
// point at any comment, not just a top-level one), so this takes the whole
// flat list for the post and groups it into threads here — rendered visually
// flat (every descendant sits at the same single indent under its top-level
// ancestor) rather than nesting indentation per depth.
export function CommentThread({
  postId,
  comments,
  currentUserId,
}: {
  postId: number;
  comments: CommentWithAuthor[];
  currentUserId: number | null;
}) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const topLevel = comments.filter((c) => c.parentId === null);

  function descendantsOf(id: number): CommentWithAuthor[] {
    const direct = comments.filter((c) => c.parentId === id);
    return direct
      .flatMap((d) => [d, ...descendantsOf(d.id)])
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  const totalCount = comments.length;

  async function handleSubmit() {
    if (text.trim().length === 0) return;
    setSubmitting(true);
    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, parentId: null, bodyText: text }),
    });
    setSubmitting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      notifications.show({ color: 'red', title: 'Failed to post comment', message: body?.error ?? 'Something went wrong' });
      return;
    }
    setText('');
    router.refresh();
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Text fw={700}>Comments{totalCount > 0 ? ` (${totalCount})` : ''}</Text>
        {currentUserId && (
          <Button size="xs" onClick={handleSubmit} loading={submitting}>
            Post
          </Button>
        )}
      </Group>

      {currentUserId ? (
        <Textarea value={text} onChange={(e) => setText(e.currentTarget.value)} placeholder="Add a comment" minRows={2} />
      ) : (
        <Text size="sm" c="sand.6">
          <LinkText href="/login" span c="coral.7">
            Sign in
          </LinkText>{' '}
          to leave a comment.
        </Text>
      )}

      {comments.length === 0 && (
        <Text c="sand.6" size="sm">
          No comments yet.
        </Text>
      )}
      {topLevel.map((comment) => (
        <CommentThreadGroup
          key={comment.id}
          comment={comment}
          descendants={descendantsOf(comment.id)}
          postId={postId}
          currentUserId={currentUserId}
          onChanged={() => router.refresh()}
        />
      ))}
    </Stack>
  );
}

function CommentThreadGroup({
  comment,
  descendants,
  postId,
  currentUserId,
  onChanged,
}: {
  comment: CommentWithAuthor;
  descendants: CommentWithAuthor[];
  postId: number;
  currentUserId: number | null;
  onChanged: () => void;
}) {
  return (
    <Stack gap="xs">
      <CommentEntry comment={comment} postId={postId} currentUserId={currentUserId} onChanged={onChanged} />
      {descendants.length > 0 && (
        <Stack gap="xs" ml={44}>
          {descendants.map((reply) => (
            <CommentEntry key={reply.id} comment={reply} postId={postId} currentUserId={currentUserId} onChanged={onChanged} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// A single comment (top-level or a reply at any depth) plus its own Reply
// affordance — every comment gets one, regardless of nesting.
function CommentEntry({
  comment,
  postId,
  currentUserId,
  onChanged,
}: {
  comment: CommentWithAuthor;
  postId: number;
  currentUserId: number | null;
  onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <Stack gap="xs">
      <CommentCard comment={comment} currentUserId={currentUserId} onDeleted={onChanged} />
      {currentUserId && (
        <Button size="xs" variant="subtle" onClick={() => setReplying((v) => !v)} w="fit-content" ml={44}>
          {replying ? 'Cancel' : 'Reply'}
        </Button>
      )}
      {replying && (
        <Stack ml={44}>
          <NewCommentForm
            postId={postId}
            parentId={comment.id}
            onPosted={() => {
              setReplying(false);
              onChanged();
            }}
          />
        </Stack>
      )}
    </Stack>
  );
}

function CommentCard({
  comment,
  currentUserId,
  onDeleted,
}: {
  comment: CommentWithAuthor;
  currentUserId: number | null;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const canDelete = currentUserId === comment.authorId;

  async function handleDelete() {
    setDeleting(true);
    const response = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' });
    setDeleting(false);
    if (!response.ok) {
      notifications.show({ color: 'red', title: 'Failed to delete comment', message: 'Something went wrong' });
      return;
    }
    onDeleted();
  }

  return (
    <Group align="flex-start" wrap="nowrap" gap="sm">
      <Avatar size={36} color="coral" variant="filled" mt={2}>
        {comment.author.name.slice(0, 1).toUpperCase()}
      </Avatar>
      <Paper shadow="sm" p="md" flex={1}>
        <Group gap="xs" justify="space-between" wrap="nowrap" mb={4}>
          <Group gap={6}>
            <Text size="sm" fw={600}>
              {comment.author.name}
            </Text>
            <Text size="xs" c="sand.6">
              · {relativeTime(comment.createdAt)}
            </Text>
          </Group>
          {canDelete && (
            <Button size="compact-xs" variant="subtle" color="red" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          )}
        </Group>
        <Text size="sm">{comment.bodyText}</Text>
      </Paper>
    </Group>
  );
}

function NewCommentForm({
  postId,
  parentId,
  onPosted,
}: {
  postId: number;
  parentId: number | null;
  onPosted: () => void;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (text.trim().length === 0) return;
    setSubmitting(true);
    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, parentId, bodyText: text }),
    });
    setSubmitting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      notifications.show({ color: 'red', title: 'Failed to post comment', message: body?.error ?? 'Something went wrong' });
      return;
    }
    setText('');
    onPosted();
  }

  return (
    <Stack gap="xs">
      <Textarea value={text} onChange={(e) => setText(e.currentTarget.value)} placeholder="Add a comment" minRows={2} />
      <Button size="xs" onClick={handleSubmit} loading={submitting} w="fit-content">
        Post
      </Button>
    </Stack>
  );
}
