import { Avatar, Badge, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { prisma } from '@/lib/db';
import { relativeTime } from '@/lib/format';
import { LinkText } from '@/components/shared/LinkText';

export default async function WritersPage() {
  const writers = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, bio: true, avatarPath: true },
  });

  // Two groupBys instead of a per-writer query loop — O(1) round trips
  // regardless of how many writers there are.
  const [postStats, commentStats] = await Promise.all([
    prisma.post.groupBy({
      by: ['authorId'],
      where: { status: 'PUBLISHED' },
      _count: { _all: true },
      _max: { publishedAt: true },
    }),
    prisma.comment.groupBy({
      by: ['authorId'],
      where: { deletedAt: null },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
  ]);

  const postStatsByAuthor = new Map(postStats.map((s) => [s.authorId, s]));
  const commentStatsByAuthor = new Map(commentStats.map((s) => [s.authorId, s]));

  return (
    <Stack maw={720} mx="auto" gap="lg">
      <Stack gap={4}>
        <Title order={1}>Writers</Title>
        <Text c="sand.6">The people behind the reviews</Text>
      </Stack>
      <Stack gap="md">
        {writers.map((writer) => {
          const posts = postStatsByAuthor.get(writer.id);
          const comments = commentStatsByAuthor.get(writer.id);
          const lastActive = latestOf(posts?._max.publishedAt, comments?._max.createdAt);

          return (
            <Paper key={writer.id} shadow="sm" p="lg">
              <Group align="flex-start" wrap="nowrap">
                <Avatar
                  src={writer.avatarPath ? `/api/media/${writer.avatarPath}` : null}
                  size={56}
                  color="coral"
                  variant="filled"
                >
                  {writer.name.slice(0, 1).toUpperCase()}
                </Avatar>
                <Stack gap={4} flex={1}>
                  <Group gap="xs" align="baseline">
                    <LinkText href={`/writers/${writer.id}`} fw={700} style={{ color: 'var(--mantine-color-black)' }}>
                      {writer.name}
                    </LinkText>
                    {lastActive && (
                      <Text size="xs" c="sand.6">
                        Active {relativeTime(lastActive)}
                      </Text>
                    )}
                  </Group>
                  {writer.bio && (
                    <Text size="sm" c="sand.6" lineClamp={2}>
                      {writer.bio}
                    </Text>
                  )}
                  <Group gap="xs" mt={2}>
                    <Badge color="sage" size="sm" variant="light">
                      {posts?._count._all ?? 0} review{(posts?._count._all ?? 0) === 1 ? '' : 's'}
                    </Badge>
                    <Badge color="sage" size="sm" variant="light">
                      {comments?._count._all ?? 0} comment{(comments?._count._all ?? 0) === 1 ? '' : 's'}
                    </Badge>
                  </Group>
                </Stack>
              </Group>
            </Paper>
          );
        })}
        {writers.length === 0 && <Text c="sand.6">No writers yet.</Text>}
      </Stack>
    </Stack>
  );
}

function latestOf(a: Date | null | undefined, b: Date | null | undefined): Date | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a > b ? a : b;
}
