'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Post, Product } from '@prisma/client';
import { Badge, Button, Group, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';

type PostWithProduct = Post & { product: Product };

export function DashboardList({ posts }: { posts: PostWithProduct[] }) {
  const router = useRouter();

  async function togglePublish(post: PostWithProduct) {
    const nextStatus = post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const response = await fetch(`/api/posts/${post.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      notifications.show({
        color: 'red',
        title: 'Failed to update status',
        message: body?.error ?? 'Something went wrong',
      });
      return;
    }
    router.refresh();
  }

  if (posts.length === 0) {
    return <Text c="sand.6">You haven&apos;t written anything yet.</Text>;
  }

  return (
    <Table highlightOnHover verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Title</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {posts.map((post) => (
          <Table.Tr key={post.id}>
            <Table.Td>
              <Text size="sm" fw={600}>
                {post.title}
              </Text>
              <Text size="xs" c="sand.6">
                {post.product.name}
              </Text>
            </Table.Td>
            <Table.Td>
              <Badge color={post.status === 'PUBLISHED' ? 'sage' : 'sand'} variant="light">
                {post.status}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Group justify="flex-end" gap="xs">
                <Button size="xs" variant="default" component={Link} href={`/posts/${post.id}/edit`}>
                  Edit
                </Button>
                <Button size="xs" variant="subtle" onClick={() => togglePublish(post)}>
                  {post.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                </Button>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
