import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UsersManager } from './UsersManager';

export default async function UsersPage() {
  const session = await getSession();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  });

  return <UsersManager initialUsers={users} currentUserId={session?.userId ?? null} />;
}
