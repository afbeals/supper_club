import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ProfileForm } from '@/components/shared/ProfileForm';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, bio: true, avatarPath: true },
  });
  if (!user) {
    redirect('/login');
  }

  return <ProfileForm name={user.name} initialBio={user.bio} initialAvatarPath={user.avatarPath} />;
}
