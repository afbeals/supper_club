'use client';

import { useState } from 'react';
import { ActionIcon, Group, Image, SimpleGrid, Text } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconPhoto, IconTrash, IconUpload, IconX } from '@tabler/icons-react';

export interface UploadedImage {
  path: string;
  thumbPath: string;
  width: number;
  height: number;
  mimeType: string;
  byteSize: number;
}

export function ImageDropzone({
  value,
  onChange,
}: {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleDrop(files: File[]) {
    setUploading(true);
    const uploaded: UploadedImage[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/uploads', { method: 'POST', body: formData });
      const body = (await response.json().catch(() => null)) as
        | { image?: UploadedImage; error?: string }
        | null;

      if (!response.ok || !body?.image) {
        notifications.show({
          color: 'red',
          title: 'Upload failed',
          message: body?.error ?? file.name,
        });
        continue;
      }
      uploaded.push(body.image);
    }

    setUploading(false);
    if (uploaded.length > 0) {
      onChange([...value, ...uploaded]);
    }
  }

  function handleRemove(path: string) {
    onChange(value.filter((image) => image.path !== path));
  }

  return (
    <div>
      <Dropzone onDrop={handleDrop} accept={IMAGE_MIME_TYPE} loading={uploading} maxSize={8 * 1024 * 1024}>
        <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload size={40} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={40} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto size={40} />
          </Dropzone.Idle>
          <Text size="sm">Drag photos here, or click to select</Text>
        </Group>
      </Dropzone>

      {value.length > 0 && (
        <SimpleGrid cols={4} mt="sm">
          {value.map((image) => (
            <div key={image.path} style={{ position: 'relative' }}>
              <Image src={`/api/media/${image.thumbPath}`} radius="sm" h={100} alt="" />
              <ActionIcon
                size="sm"
                color="red"
                variant="filled"
                style={{ position: 'absolute', top: 4, right: 4 }}
                onClick={() => handleRemove(image.path)}
                aria-label="Remove image"
              >
                <IconTrash size={14} />
              </ActionIcon>
            </div>
          ))}
        </SimpleGrid>
      )}
    </div>
  );
}
