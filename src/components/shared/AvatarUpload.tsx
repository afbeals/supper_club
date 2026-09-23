'use client';

import { useState } from 'react';
import { Avatar, Button, Group } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconUpload } from '@tabler/icons-react';

interface UploadedImage {
  thumbPath: string;
}

export function AvatarUpload({
  name,
  avatarPath,
  onChange,
}: {
  name: string;
  avatarPath: string | null;
  onChange: (avatarPath: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleDrop(files: File[]) {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/uploads', { method: 'POST', body: formData });
    const body = (await response.json().catch(() => null)) as { image?: UploadedImage; error?: string } | null;
    setUploading(false);

    if (!response.ok || !body?.image) {
      notifications.show({ color: 'red', title: 'Upload failed', message: body?.error ?? file.name });
      return;
    }
    onChange(body.image.thumbPath);
  }

  return (
    <Group align="center">
      <Avatar src={avatarPath ? `/api/media/${avatarPath}` : null} size={80} radius="md">
        {name.slice(0, 1).toUpperCase()}
      </Avatar>
      <Dropzone onDrop={handleDrop} accept={IMAGE_MIME_TYPE} loading={uploading} maxSize={8 * 1024 * 1024} multiple={false}>
        <Group gap="xs" style={{ pointerEvents: 'none' }}>
          <IconUpload size={16} />
          <span>Drag a photo here, or click to select</span>
        </Group>
      </Dropzone>
      {avatarPath && (
        <Button variant="subtle" color="red" size="xs" onClick={() => onChange(null)}>
          Remove
        </Button>
      )}
    </Group>
  );
}
