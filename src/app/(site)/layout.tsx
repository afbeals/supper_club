import { getSession } from '@/lib/auth';
import { SiteShell } from '@/components/shared/SiteShell';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <SiteShell
      isSignedIn={session !== null}
      userName={session?.userName ?? null}
      isAdmin={session?.role === 'ADMIN'}
      avatarPath={session?.avatarPath ?? null}
    >
      {children}
    </SiteShell>
  );
}
