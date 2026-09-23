'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Post, Product, ProductType } from '@prisma/client';
import { ActionIcon, Badge, Box, CloseButton, Group, Paper, Stack, Text } from '@mantine/core';
import { IconGitCompare } from '@tabler/icons-react';
import { ReviewListRow } from '@/components/post/ReviewListRow';

type PostWithRelations = Post & {
  author: { id: number; name: string };
  product: Product & { productType: ProductType };
};

// Client-side only selection — no persistence. This component unmounts when
// the user navigates away from the product hub, which is exactly how "leaving
// the page closes compare" falls out for free: there's nowhere else the
// selection could be stored.
export function ProductCompareSelector({
  posts,
  productSlug,
  scores,
}: {
  posts: PostWithRelations[];
  productSlug: string;
  scores: Record<number, number | null>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<PostWithRelations[]>([]);

  function toggle(post: PostWithRelations) {
    if (selected.some((p) => p.id === post.id)) {
      setSelected((prev) => prev.filter((p) => p.id !== post.id));
      return;
    }

    const next = [...selected, post];
    if (next.length >= 2) {
      router.push(`/products/${productSlug}/compare?posts=${next.map((p) => p.id).join(',')}`);
      return;
    }
    setSelected(next);
  }

  const showCompareButtons = posts.length > 1;

  return (
    <>
      <Stack gap="md">
        {posts.map((post) => {
          const isSelected = selected.some((p) => p.id === post.id);
          const score = scores[post.id] ?? null;
          return (
            <Box key={post.id} pos="relative">
              <ReviewListRow post={post} variant="card" compact />
              {score !== null && (
                <Badge color="coral" size="sm" variant="filled" pos="absolute" top={12} right={12}>
                  {score}/100
                </Badge>
              )}
              {showCompareButtons && (
                <ActionIcon
                  aria-label={isSelected ? `Remove ${post.title} from compare` : `Compare ${post.title}`}
                  variant={isSelected ? 'filled' : 'light'}
                  color="coral"
                  size="lg"
                  radius="xl"
                  pos="absolute"
                  bottom={12}
                  right={12}
                  onClick={() => toggle(post)}
                >
                  <IconGitCompare size={18} />
                </ActionIcon>
              )}
            </Box>
          );
        })}
      </Stack>

      {selected.length > 0 && (
        <Paper shadow="md" p="md" pos="fixed" bottom={24} right={24} w={300} style={{ zIndex: 200 }}>
          <Stack gap="xs">
            <Group justify="space-between" wrap="nowrap">
              <Text fw={700} size="sm">
                {selected.length} review{selected.length === 1 ? '' : 's'} ready
              </Text>
              <CloseButton aria-label="Cancel compare selection" size="sm" onClick={() => setSelected([])} />
            </Group>
            {selected.map((post) => (
              <Text key={post.id} size="sm" c="sand.6">
                {post.title} —{' '}
                <Text span fw={600} c="var(--mantine-color-black)">
                  {post.author.name}
                </Text>
              </Text>
            ))}
            <Text size="xs" c="sand.6">
              Pick another review to compare.
            </Text>
          </Stack>
        </Paper>
      )}
    </>
  );
}
