import { notFound } from 'next/navigation';
import { Badge, Group, Image, Paper, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { normalizeRating, overallScore } from '@/lib/scoring';
import { CommentThread } from '@/components/comments/CommentThread';
import { LinkAvatar } from '@/components/shared/LinkAvatar';
import { LinkText } from '@/components/shared/LinkText';

export default async function PostDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: true,
      product: { include: { productType: true } },
      ratings: { include: { criterion: true } },
      bullets: { orderBy: { sortOrder: 'asc' } },
      images: { where: { subitemId: null }, orderBy: { sortOrder: 'asc' } },
      subitems: { orderBy: { sortOrder: 'asc' }, include: { images: { orderBy: { sortOrder: 'asc' } } } },
      // Flat — every comment on the post regardless of nesting depth.
      // CommentThread groups these into threads client-side, since a reply
      // can itself have replies and Prisma has no recursive `include`.
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        // select, not include: true — this gets passed into CommentThread,
        // a client component, so the full User row (passwordHash included)
        // would otherwise be serialized into the page's RSC payload.
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });

  if (!post || (post.status !== 'PUBLISHED' && post.authorId !== session?.userId)) {
    notFound();
  }

  const overall = overallScore(
    post.ratings.map((r) => ({
      value: r.value,
      minValue: r.criterion.minValue,
      maxValue: r.criterion.maxValue,
      higherIsBetter: r.criterion.higherIsBetter,
      weight: r.criterion.weight,
    })),
  );

  const pros = post.bullets.filter((b) => b.kind === 'PRO');
  const cons = post.bullets.filter((b) => b.kind === 'CON');

  return (
    <Stack maw={720} mx="auto" gap="lg">
      <Stack gap="sm">
        {post.status === 'DRAFT' && (
          <Group gap="xs">
            <Badge color="sand" variant="light">
              Draft
            </Badge>
          </Group>
        )}
        <Group gap="sm" align="flex-start">
          <LinkAvatar href={`/writers/${post.author.id}`} size={40} color="coral" variant="filled">
            {post.author.name.slice(0, 1).toUpperCase()}
          </LinkAvatar>
          <Stack gap={0}>
            <Text size="sm">
              <LinkText href={`/writers/${post.author.id}`} span fw={700} style={{ color: 'var(--mantine-color-black)' }}>
                {post.author.name}
              </LinkText>
              {' reviewed '}
              <LinkText href={`/products/${post.product.slug}`} span fw={700} c="coral.7">
                {post.product.name}
              </LinkText>
            </Text>
            <Text size="xs" c="sand.6">
              {formatDate(post.publishedAt ?? post.createdAt)}
            </Text>
          </Stack>
        </Group>
        <Title order={1}>{post.title}</Title>
        {post.summary && (
          <Text fw={600} ff="var(--font-nunito)">
            {post.summary}
          </Text>
        )}
      </Stack>

      {post.ratings.length > 0 && (
        <Paper shadow="sm" p="lg">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={700} size="sm">
                Overall
              </Text>
              {overall !== null && (
                <Badge color="coral" size="lg" variant="filled">
                  {overall}/100
                </Badge>
              )}
            </Group>
            {post.ratings.map((rating) => (
              <div key={rating.id}>
                <Group justify="space-between" mb={4}>
                  <Text size="sm">{rating.criterion.name}</Text>
                  <Text size="sm" c="coral.7" fw={600}>
                    {rating.value}/{rating.criterion.maxValue}
                  </Text>
                </Group>
                <Progress
                  value={normalizeRating({
                    value: rating.value,
                    minValue: rating.criterion.minValue,
                    maxValue: rating.criterion.maxValue,
                    higherIsBetter: rating.criterion.higherIsBetter,
                  })}
                  color="coral"
                  size="sm"
                />
                {rating.note && (
                  <Text size="xs" c="sand.6" mt={2}>
                    {rating.note}
                  </Text>
                )}
              </div>
            ))}
          </Stack>
        </Paper>
      )}

      {(pros.length > 0 || cons.length > 0) && (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {pros.length > 0 && (
            <Paper
              p="lg"
              shadow="sm"
              style={{ backgroundColor: 'var(--mantine-color-sage-0)', border: '1px solid var(--mantine-color-sage-2)' }}
            >
              <Text fw={700} size="sm" c="sage.9" mb="xs">
                Pros
              </Text>
              <Stack gap={6}>
                {pros.map((b) => (
                  <Text key={b.id} size="sm">
                    + {b.text}
                  </Text>
                ))}
              </Stack>
            </Paper>
          )}
          {cons.length > 0 && (
            <Paper
              p="lg"
              shadow="sm"
              style={{ backgroundColor: 'var(--mantine-color-coral-0)', border: '1px solid var(--mantine-color-coral-2)' }}
            >
              <Text fw={700} size="sm" c="coral.8" mb="xs">
                Cons
              </Text>
              <Stack gap={6}>
                {cons.map((b) => (
                  <Text key={b.id} size="sm">
                    − {b.text}
                  </Text>
                ))}
              </Stack>
            </Paper>
          )}
        </SimpleGrid>
      )}

      {/* bodyHtml is sanitized server-side on every save (src/lib/sanitize.ts), not just on render */}
      <div dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />

      {post.images.length > 0 && (
        <SimpleGrid cols={3}>
          {post.images.map((img) => (
            <Image
              key={img.id}
              src={`/api/media/${img.thumbPath}`}
              radius="md"
              alt={img.caption}
              style={{ boxShadow: 'var(--mantine-shadow-sm)' }}
            />
          ))}
        </SimpleGrid>
      )}

      {post.subitems.length > 0 && (
        <Stack gap="sm">
          <Text fw={700}>Chapters / items</Text>
          {post.subitems.map((subitem) => (
            <Paper key={subitem.id} shadow="sm" p="md">
              <Group justify="space-between">
                <Text fw={600} size="sm">
                  {subitem.label}
                </Text>
                {subitem.rating !== null && (
                  <Badge color="sage" size="sm" variant="light">
                    {subitem.rating}/10
                  </Badge>
                )}
              </Group>
              {subitem.notes && (
                <Text size="sm" c="sand.7" mt={4}>
                  {subitem.notes}
                </Text>
              )}
              {subitem.images.length > 0 && (
                <SimpleGrid cols={3} mt="xs">
                  {subitem.images.map((img) => (
                    <Image key={img.id} src={`/api/media/${img.thumbPath}`} radius="md" alt={img.caption} />
                  ))}
                </SimpleGrid>
              )}
            </Paper>
          ))}
        </Stack>
      )}

      <CommentThread postId={post.id} comments={post.comments} currentUserId={session?.userId ?? null} />
    </Stack>
  );
}
