import type { Post, Product, ProductType } from '@prisma/client';
import { Avatar, Badge, Box, Group, Stack, Text } from '@mantine/core';
import { LinkCard } from '@/components/shared/LinkCard';
import { LinkText } from '@/components/shared/LinkText';
import styles from './ReviewListRow.module.css';

// author is deliberately narrowed to just what this component renders, not
// the full User row (passwordHash included) — it gets rendered from inside
// a Client Component (ProductCompareSelector), so this prop's actual value
// is serialized across the server/client boundary, unlike a Server Component
// prop that only ever produces server-rendered HTML.
type PostWithRelations = Post & {
  author: { id: number; name: string };
  product: Product & { productType: ProductType };
};

const CHIP_COLORS = ['coral', 'sage'] as const;

// Two visual treatments of the same content: a compact, borderless "row" for
// list-heavy pages (Product Hub) and a padded, shadowed "card" for pages
// designed as a grid of cards (Reviews index). `compact` drops the category
// chip, product name, and summary — for contexts (like a single product's
// hub page) where the product and its type are already shown once above the
// whole list, so repeating them per-row is redundant.
export function ReviewListRow({
  post,
  trailing,
  variant = 'row',
  compact = false,
}: {
  post: PostWithRelations;
  trailing?: React.ReactNode;
  variant?: 'row' | 'card';
  compact?: boolean;
}) {
  const chipColor = CHIP_COLORS[post.product.productType.id % CHIP_COLORS.length];

  const content = (
    <>
      <Avatar size={variant === 'card' ? 44 : 32} color="coral" variant="filled" mt={variant === 'card' ? 0 : 2}>
        {post.author.name.slice(0, 1).toUpperCase()}
      </Avatar>
      <Stack gap={variant === 'card' ? 6 : 2} flex={1}>
        {!compact && (
          <Group gap="xs">
            <Badge color={chipColor} size="sm" variant="filled">
              {post.product.productType.name}
            </Badge>
            <Text size="xs" c="sand.6" fw={600}>
              {post.product.name}
            </Text>
          </Group>
        )}
        {variant === 'card' ? (
          <Text fw={700} size="sm">
            {post.title}
          </Text>
        ) : (
          <LinkText href={`/posts/${post.slug}`} fw={700} size="sm" style={{ color: 'var(--mantine-color-black)' }}>
            {post.title}
          </LinkText>
        )}
        {!compact && post.summary && (
          <Text size="sm" c="sand.6">
            {post.summary}
          </Text>
        )}
        <Text size="xs" c="sand.6">
          by {post.author.name}
        </Text>
      </Stack>
      {trailing && <Box flex="0 0 auto">{trailing}</Box>}
    </>
  );

  if (variant === 'card') {
    return (
      <LinkCard href={`/posts/${post.slug}`} padding="lg" withBorder={false} className={styles.card}>
        <Group align="center" gap="md" wrap="nowrap">
          {content}
        </Group>
      </LinkCard>
    );
  }

  return (
    <Group
      align="flex-start"
      py="md"
      style={{ borderBottom: '1px solid var(--mantine-color-sand-1)' }}
      wrap="nowrap"
    >
      {content}
    </Group>
  );
}
