'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Group, Paper, Stack, Text, Textarea, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AvatarUpload } from '@/components/shared/AvatarUpload';

export function ProfileForm({
  name,
  initialBio,
  initialAvatarPath,
}: {
  name: string;
  initialBio: string;
  initialAvatarPath: string | null;
}) {
  const router = useRouter();
  const [bio, setBio] = useState(initialBio);
  const [avatarPath, setAvatarPath] = useState(initialAvatarPath);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio, avatarPath }),
    });
    setSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      notifications.show({ color: 'red', title: 'Failed to save', message: body?.error ?? 'Something went wrong' });
      return;
    }

    notifications.show({ color: 'green', title: 'Profile updated', message: '' });
    router.refresh();
  }

  return (
    <Stack maw={480} mx="auto" gap="lg">
      <Stack gap={4}>
        <Title order={1}>Edit profile</Title>
        <Text size="sm" c="sand.6">
          This is shown on your public Writers profile.
        </Text>
      </Stack>

      <Paper withBorder p="lg">
        <Stack>
          <AvatarUpload name={name} avatarPath={avatarPath} onChange={setAvatarPath} />
          <Textarea
            label="Bio"
            placeholder="A couple sentences about you"
            value={bio}
            onChange={(event) => setBio(event.currentTarget.value)}
            maxLength={500}
            minRows={3}
          />

          <Group justify="flex-end">
            <Button loading={submitting} onClick={handleSave}>
              Save
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
