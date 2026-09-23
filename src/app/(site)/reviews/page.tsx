import type { Prisma } from '@prisma/client';
import { Group, Stack, Text, Title } from '@mantine/core';
import { prisma } from '@/lib/db';
import { ReviewListRow } from '@/components/post/ReviewListRow';
import { ReviewsFilterBar } from './ReviewsFilterBar';

interface ReviewsSearchParams {
  types?: string;
  author?: string;
  sort?: string;
}

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<ReviewsSearchParams> }) {
  const params = await searchParams;
  const sort = params.sort === 'oldest' ? 'asc' : 'desc';
  const authorId = params.author ? Number(params.author) : undefined;
  const typeSlugs = params.types?.split(',').filter(Boolean) ?? [];

  const [productTypes, authors] = await Promise.all([
    prisma.productType.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: 'asc' } }),
    // select, not a bare findMany — this gets passed into ReviewsFilterBar, a
    // client component, so the full User row (passwordHash included) would
    // otherwise be serialized into the page's RSC payload.
    prisma.user.findMany({
      where: { posts: { some: { status: 'PUBLISHED' } } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const where: Prisma.PostWhereInput = {
    status: 'PUBLISHED',
    ...(authorId && Number.isInteger(authorId) ? { authorId } : {}),
    ...(typeSlugs.length > 0 ? { product: { productType: { slug: { in: typeSlugs } } } } : {}),
  };

  const posts = await prisma.post.findMany({
    where,
    orderBy: { publishedAt: sort },
    include: { author: true, product: { include: { productType: true } } },
  });

  return (
    <Stack maw={1360} mx="auto" gap="lg">
      <Title order={1}>Reviews</Title>
      <Group align="flex-start" gap="xl" wrap="nowrap">
        <ReviewsFilterBar productTypes={productTypes} authors={authors} />
        <Stack gap="md" flex={1} style={{ minWidth: 0 }}>
          {posts.map((post) => (
            <ReviewListRow key={post.id} post={post} variant="card" />
          ))}
          {posts.length === 0 && <Text c="sand.6">Nothing matches those filters.</Text>}
        </Stack>
      </Group>
    </Stack>
  );
}
