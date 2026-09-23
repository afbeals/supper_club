import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { SiteShell } from '@/components/shared/SiteShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <SiteShell isSignedIn userName={session.userName} isAdmin={session.role === 'ADMIN'} avatarPath={session.avatarPath}>
      {children}
    </SiteShell>
  );
}
