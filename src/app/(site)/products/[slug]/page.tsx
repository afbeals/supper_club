import { notFound } from 'next/navigation';
import { Badge, Group, Paper, Progress, Stack, Text, Title } from '@mantine/core';
import { prisma } from '@/lib/db';
import { normalizeRating, overallScore } from '@/lib/scoring';
import { ProductCompareSelector } from '@/components/product/ProductCompareSelector';

export default async function ProductHubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      productType: { include: { criteria: { where: { archivedAt: null }, orderBy: { sortOrder: 'asc' } } } },
    },
  });
  if (!product) {
    notFound();
  }

  const posts = await prisma.post.findMany({
    where: { productId: product.id, status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    include: {
      // select, not include: true — this gets passed into
      // ProductCompareSelector, a client component, so the full User row
      // (passwordHash included) would otherwise be serialized into the
      // page's RSC payload.
      author: { select: { id: true, name: true } },
      product: { include: { productType: true } },
      ratings: { include: { criterion: true } },
    },
  });

  const criterionAverages = product.productType.criteria.map((criterion) => {
    const values = posts.flatMap((post) =>
      post.ratings
        .filter((r) => r.criterionId === criterion.id)
        .map((r) =>
          normalizeRating({
            value: r.value,
            minValue: criterion.minValue,
            maxValue: criterion.maxValue,
            higherIsBetter: criterion.higherIsBetter,
          }),
        ),
    );
    const average = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
    return { criterion, average };
  });

  return (
    <Stack maw={720} mx="auto" gap="lg">
      <Paper shadow="sm" p="lg">
        <Stack gap={6}>
          <Badge color="coral" size="sm" variant="filled" w="fit-content">
            {product.productType.name}
          </Badge>
          <Title order={1}>{product.name}</Title>
          {product.subtitle && <Text c="sand.6">{product.subtitle}</Text>}
        </Stack>
      </Paper>

      {criterionAverages.some((c) => c.average !== null) && (
        <Paper shadow="sm" p="lg">
          <Stack gap="sm">
            <Text fw={700} size="sm">
              Aggregate scores ({posts.length} review{posts.length === 1 ? '' : 's'})
            </Text>
            {criterionAverages.map(({ criterion, average }) =>
              average === null ? null : (
                <div key={criterion.id}>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">{criterion.name}</Text>
                    <Text size="sm" c="coral.7" fw={600}>
                      {average}/100
                    </Text>
                  </Group>
                  <Progress value={average} color="coral" size="sm" />
                </div>
              ),
            )}
          </Stack>
        </Paper>
      )}

      <Stack gap="md">
        <Text fw={700}>Reviews of this {product.productType.name.toLowerCase()}</Text>
        {posts.length > 0 ? (
          <ProductCompareSelector
            posts={posts}
            productSlug={product.slug}
            scores={Object.fromEntries(
              posts.map((post) => [
                post.id,
                overallScore(
                  post.ratings.map((r) => ({
                    value: r.value,
                    minValue: r.criterion.minValue,
                    maxValue: r.criterion.maxValue,
                    higherIsBetter: r.criterion.higherIsBetter,
                    weight: r.criterion.weight,
                  })),
                ),
              ]),
            )}
          />
        ) : (
          <Text c="sand.6">No published reviews yet.</Text>
        )}
      </Stack>
    </Stack>
  );
}
