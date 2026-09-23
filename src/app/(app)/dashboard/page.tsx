import { redirect } from 'next/navigation';
import { Paper, Stack, Text, Title } from '@mantine/core';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardList } from './DashboardList';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const posts = await prisma.post.findMany({
    where: { authorId: session.userId },
    orderBy: { createdAt: 'desc' },
    include: { product: true },
  });

  return (
    <Stack maw={860} mx="auto" gap="lg">
      <Stack gap={4}>
        <Title order={1}>My posts</Title>
        <Text c="sand.6">Your drafts and published reviews</Text>
      </Stack>
      <Paper withBorder p="lg">
        <DashboardList posts={posts} />
      </Paper>
    </Stack>
  );
}
