import { Stack, Text, Title } from '@mantine/core';
import { prisma } from '@/lib/db';
import { PostCard } from '@/components/post/PostCard';

export default async function HomePage() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 20,
    include: { author: true, product: { include: { productType: true } } },
  });

  return (
    <Stack maw={720} mx="auto" gap="lg">
      <Stack gap={4}>
        <Title order={1}>The Feed</Title>
        <Text c="sand.6">What the club has been up to</Text>
      </Stack>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {posts.length === 0 && <Text c="sand.6">Nothing published yet.</Text>}
    </Stack>
  );
}
