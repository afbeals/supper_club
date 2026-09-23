import { notFound } from 'next/navigation';
import { Avatar, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { PostCard } from '@/components/post/PostCard';
import { LinkText } from '@/components/shared/LinkText';

const RECENT_COMMENTS_LIMIT = 20;

export default async function WriterProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    notFound();
  }

  const writer = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, bio: true, avatarPath: true, active: true },
  });
  if (!writer || !writer.active) {
    notFound();
  }

  const [posts, reviewCount, commentCount, comments] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: userId, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      include: { author: true, product: { include: { productType: true } } },
    }),
    prisma.post.count({ where: { authorId: userId, status: 'PUBLISHED' } }),
    prisma.comment.count({ where: { authorId: userId, deletedAt: null } }),
    prisma.comment.findMany({
      where: { authorId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: RECENT_COMMENTS_LIMIT,
      select: { id: true, bodyText: true, createdAt: true, post: { select: { slug: true, title: true } } },
    }),
  ]);

  const lastReviewDate = posts[0]?.publishedAt ?? null;
  const lastCommentDate = comments[0]?.createdAt ?? null;

  return (
    <Stack maw={720} mx="auto" gap="lg">
      <Group align="flex-start">
        <Avatar src={writer.avatarPath ? `/api/media/${writer.avatarPath}` : null} size={80} color="coral" variant="filled">
          {writer.name.slice(0, 1).toUpperCase()}
        </Avatar>
        <Stack gap={4}>
          <Title order={1}>{writer.name}</Title>
          {writer.bio && <Text c="sand.6">{writer.bio}</Text>}
        </Stack>
      </Group>

      <Paper shadow="sm" p="lg">
        <SimpleGrid cols={{ base: 2, sm: 4 }}>
          <Stat label="Reviews" value={String(reviewCount)} />
          <Stat label="Comments" value={String(commentCount)} />
          <Stat label="Last review" value={formatDate(lastReviewDate)} />
          <Stat label="Last comment" value={formatDate(lastCommentDate)} />
        </SimpleGrid>
      </Paper>

      <Stack gap="sm">
        <Text fw={700}>Reviews</Text>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        {posts.length === 0 && <Text c="sand.6">No published reviews yet.</Text>}
      </Stack>

      <Stack gap="sm">
        <Text fw={700}>
          Comments{commentCount > RECENT_COMMENTS_LIMIT ? ` (most recent ${RECENT_COMMENTS_LIMIT})` : ''}
        </Text>
        <Paper shadow="sm" p="lg">
          {comments.map((comment) => (
            <div key={comment.id} style={{ borderBottom: '1px solid var(--mantine-color-sand-1)' }}>
              <Text size="sm" py="sm">
                {comment.bodyText}
              </Text>
              <Text size="xs" c="sand.6" mb="sm">
                {formatDate(comment.createdAt)} on{' '}
                <LinkText href={`/posts/${comment.post.slug}`} size="xs" span c="coral.7">
                  {comment.post.title}
                </LinkText>
              </Text>
            </div>
          ))}
          {comments.length === 0 && <Text c="sand.6">No comments yet.</Text>}
        </Paper>
      </Stack>
    </Stack>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={0} align="center">
      <Text fw={700} ff="var(--font-nunito)" size="lg">
        {value}
      </Text>
      <Text size="xs" c="sand.6">
        {label}
      </Text>
    </Stack>
  );
}
