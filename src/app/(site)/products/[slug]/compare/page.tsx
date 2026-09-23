import { notFound } from 'next/navigation';
import { Avatar, Badge, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { prisma } from '@/lib/db';
import { normalizeRating, overallScore } from '@/lib/scoring';

const DISAGREEMENT_THRESHOLD = 20;

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ posts?: string }>;
}) {
  const { slug } = await params;
  const { posts: postsParam } = await searchParams;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      productType: { include: { criteria: { where: { archivedAt: null }, orderBy: { sortOrder: 'asc' } } } },
    },
  });
  if (!product) {
    notFound();
  }

  const requestedIds = postsParam
    ? postsParam
        .split(',')
        .map(Number)
        .filter((n) => Number.isInteger(n))
    : [];

  const allPublished = await prisma.post.findMany({
    where: { productId: product.id, status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    include: { author: true, ratings: true, subitems: { orderBy: { sortOrder: 'asc' } } },
  });

  const selected =
    requestedIds.length > 0 ? allPublished.filter((p) => requestedIds.includes(p.id)).slice(0, 3) : allPublished.slice(0, 3);

  if (selected.length < 2) {
    return (
      <Stack maw={720} mx="auto" gap={4}>
        <Title order={1}>{product.name}</Title>
        <Text c="sand.6">Need at least two published reviews of this product to compare.</Text>
      </Stack>
    );
  }

  const criteria = product.productType.criteria;

  const overallScores = selected.map((post) =>
    overallScore(
      post.ratings
        .map((r) => {
          const criterion = criteria.find((c) => c.id === r.criterionId);
          return criterion
            ? {
                value: r.value,
                minValue: criterion.minValue,
                maxValue: criterion.maxValue,
                higherIsBetter: criterion.higherIsBetter,
                weight: criterion.weight,
              }
            : null;
        })
        .filter((r): r is NonNullable<typeof r> => r !== null),
    ),
  );

  // Per-criterion cells across the selected reviews, plus whether that
  // criterion is a point of disagreement — same underlying computation as
  // the old table layout, just read per-post (by index) instead of per-row
  // in the new side-by-side cards below.
  const rows = criteria
    .map((criterion) => {
      const cells = selected.map((post) => {
        const rating = post.ratings.find((r) => r.criterionId === criterion.id);
        if (!rating) return null;
        return {
          value: rating.value,
          normalized: normalizeRating({
            value: rating.value,
            minValue: criterion.minValue,
            maxValue: criterion.maxValue,
            higherIsBetter: criterion.higherIsBetter,
          }),
        };
      });
      const normalizedValues = cells.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => c.normalized);
      const disagrees =
        normalizedValues.length > 1 && Math.max(...normalizedValues) - Math.min(...normalizedValues) >= DISAGREEMENT_THRESHOLD;
      return { criterion, cells, disagrees };
    })
    .filter((row) => row.cells.some((c) => c !== null));

  return (
    <Stack maw={1100} mx="auto" gap="lg">
      <Stack gap={4}>
        <Title order={1}>{product.name}</Title>
        <Text c="sand.6">Comparing {selected.length} reviews side by side</Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, md: selected.length }} spacing="lg">
        {selected.map((post, i) => (
          <Paper key={post.id} shadow="sm" p="lg">
            <Stack gap="md">
              <Stack gap={4} align="center">
                <Avatar size={48} color="coral" variant="filled">
                  {post.author.name.slice(0, 1).toUpperCase()}
                </Avatar>
                <Text fw={700} ta="center">
                  {post.author.name}
                </Text>
                {overallScores[i] !== null && (
                  <Badge color="coral" size="lg" variant="filled">
                    {overallScores[i]}/100
                  </Badge>
                )}
              </Stack>

              <Stack gap={2}>
                <Text fw={700} size="sm">
                  {post.title}
                </Text>
                {post.summary && (
                  <Text size="sm" c="sand.6">
                    {post.summary}
                  </Text>
                )}
              </Stack>

              {rows.length > 0 && (
                <Stack gap={6}>
                  <Text fw={700} size="sm">
                    Scores
                  </Text>
                  {rows.map(({ criterion, cells, disagrees }) => {
                    const cell = cells[i];
                    return (
                      <Group key={criterion.id} justify="space-between" wrap="nowrap">
                        <Text size="sm">{criterion.name}</Text>
                        {cell ? (
                          <Text size="sm" fw={disagrees ? 700 : 400} c={disagrees ? 'coral.7' : undefined}>
                            {cell.value}/{criterion.maxValue}
                          </Text>
                        ) : (
                          <Text size="sm" c="sand.5">
                            —
                          </Text>
                        )}
                      </Group>
                    );
                  })}
                </Stack>
              )}

              {post.subitems.length > 0 && (
                <Stack gap={6}>
                  <Text fw={700} size="sm">
                    Chapters / items
                  </Text>
                  {post.subitems.map((subitem) => (
                    <Group key={subitem.id} justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={0}>
                        <Text size="sm" fw={600}>
                          {subitem.label}
                        </Text>
                        {subitem.notes && (
                          <Text size="xs" c="sand.6">
                            {subitem.notes}
                          </Text>
                        )}
                      </Stack>
                      {subitem.rating !== null && (
                        <Badge color="sage" size="sm" variant="light">
                          {subitem.rating}/10
                        </Badge>
                      )}
                    </Group>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>

      {rows.some((r) => r.disagrees) && (
        <Group gap={6}>
          <Badge color="coral" size="sm" variant="light">
            highlighted
          </Badge>
          <Text size="sm" c="sand.6">
            scores show criteria where these reviews disagree the most
          </Text>
        </Group>
      )}
    </Stack>
  );
}
