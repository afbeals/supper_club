import { redirect } from 'next/navigation';
import { Stack } from '@mantine/core';
import { getSession } from '@/lib/auth';
import { SiteShell } from '@/components/shared/SiteShell';
import { AdminTabs } from './AdminTabs';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  if (session.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <SiteShell isSignedIn userName={session.userName} isAdmin avatarPath={session.avatarPath}>
      <Stack maw={860} mx="auto" gap="lg">
        <AdminTabs />
        {children}
      </Stack>
    </SiteShell>
  );
}
