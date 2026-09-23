import type { Post, Product, ProductType, User } from '@prisma/client';
import { Avatar, Badge, Group, Stack, Text } from '@mantine/core';
import { LinkCard } from '@/components/shared/LinkCard';

type PostWithRelations = Post & { author: User; product: Product & { productType: ProductType } };

// Cycles between the two accent colors by productType id so each category
// gets a consistent, distinct chip color without hardcoding category names.
const CHIP_COLORS = ['coral', 'sage'] as const;

export function PostCard({ post }: { post: PostWithRelations }) {
  const chipColor = CHIP_COLORS[post.product.productType.id % CHIP_COLORS.length];

  return (
    <LinkCard href={`/posts/${post.slug}`} padding="lg" withBorder={false}>
      <Stack gap="xs">
        <Group gap="xs">
          <Badge color={chipColor} size="sm" variant="filled">
            {post.product.productType.name}
          </Badge>
          <Text size="xs" c="sand.6" fw={600}>
            {post.product.name}
          </Text>
        </Group>
        <Text ff="var(--font-nunito)" fw={700} size="lg">
          {post.title}
        </Text>
        {post.summary && (
          <Text size="sm" c="var(--mantine-color-black)">
            {post.summary}
          </Text>
        )}
        <Group gap={10} mt={4}>
          <Avatar size={28} color="coral" variant="filled">
            {post.author.name.slice(0, 1).toUpperCase()}
          </Avatar>
          <Text size="sm" c="sand.6" fw={500}>
            {post.author.name}
          </Text>
        </Group>
      </Stack>
    </LinkCard>
  );
}
