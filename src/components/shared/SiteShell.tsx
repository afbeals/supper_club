'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell, Avatar, Button, Group, Menu, Text, UnstyledButton } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

// The one shared header for the whole site — public (site) pages, the signed-in
// (app) area, and (admin). AppShell.Header / AppShell.Main are static properties
// on the AppShell function; Next's RSC client-reference proxy for a 'use client'
// export doesn't carry those through, so accessing them from an async Server
// Component resolves to undefined ("Element type is invalid"). Keeping the whole
// AppShell tree inside this one client component avoids that entirely — every
// layout.tsx (a Server Component) just renders <SiteShell ...>{children}</SiteShell>.
export function SiteShell({
  isSignedIn,
  userName,
  isAdmin,
  avatarPath,
  children,
}: {
  isSignedIn: boolean;
  userName: string | null;
  isAdmin: boolean;
  avatarPath: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <AppShell header={{ height: 80 }} padding="md">
      <AppShell.Header style={{ backgroundColor: '#fffefc', border: 'none', boxShadow: 'var(--mantine-shadow-sm)' }}>
        <Group h="100%" px="xl" justify="space-between">
          <Group gap="xl">
            <Text
              component={Link}
              href="/"
              ff="var(--font-nunito)"
              fw={800}
              size="lg"
              style={{ textDecoration: 'none', color: 'var(--mantine-color-coral-7)' }}
            >
              Supper Club
            </Text>
            <Group gap="md">
              <Text
                component={Link}
                href="/reviews"
                size="sm"
                fw={500}
                style={{ textDecoration: 'none', color: 'var(--mantine-color-black)' }}
              >
                Reviews
              </Text>
              <Text
                component={Link}
                href="/writers"
                size="sm"
                fw={500}
                style={{ textDecoration: 'none', color: 'var(--mantine-color-black)' }}
              >
                Writers
              </Text>
            </Group>
          </Group>

          <Group gap="md">
            {isSignedIn && (
              <Button component={Link} href="/posts/new" leftSection={<IconPlus size={14} />}>
                Add review
              </Button>
            )}

            <Menu shadow="md" width={180} position="bottom-end">
              <Menu.Target>
                <UnstyledButton aria-label="Account menu">
                  <Group gap={10}>
                    {isSignedIn ? (
                      <Avatar src={avatarPath ? `/api/media/${avatarPath}` : null} color="coral" variant="filled">
                        {userName ? userName.slice(0, 1).toUpperCase() : undefined}
                      </Avatar>
                    ) : (
                      <Avatar color="sand" variant="light">
                        ?
                      </Avatar>
                    )}
                    {isSignedIn && userName && (
                      <Text size="sm" fw={600}>
                        {shortName(userName)}
                      </Text>
                    )}
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                {isSignedIn ? (
                  <>
                    <Menu.Item component={Link} href="/dashboard">
                      Dashboard
                    </Menu.Item>
                    <Menu.Item component={Link} href="/profile">
                      Profile
                    </Menu.Item>
                    {isAdmin && (
                      <Menu.Item component={Link} href="/admin">
                        Admin
                      </Menu.Item>
                    )}
                    <Menu.Divider />
                    <Menu.Item onClick={handleSignOut} color="red">
                      Sign out
                    </Menu.Item>
                  </>
                ) : (
                  <Menu.Item component={Link} href="/login">
                    Sign in
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}

// "Sample Writer" -> "Sample W." — keeps the header compact. A single-word
// name (no last name to abbreviate) is shown as-is.
function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? '';
  const first = parts[0]!;
  const lastInitial = parts[parts.length - 1]!.slice(0, 1).toUpperCase();
  return `${first} ${lastInitial}.`;
}
