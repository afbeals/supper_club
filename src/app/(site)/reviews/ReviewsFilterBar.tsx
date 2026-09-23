'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ProductType } from '@prisma/client';
import { Avatar, Checkbox, Paper, SegmentedControl, Stack, Text, UnstyledButton } from '@mantine/core';

type AuthorOption = { id: number; name: string };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.slice(0, 1) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.slice(0, 1) ?? '') : '';
  return (first + last).toUpperCase();
}

export function ReviewsFilterBar({ productTypes, authors }: { productTypes: ProductType[]; authors: AuthorOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedTypes = searchParams.get('types')?.split(',').filter(Boolean) ?? [];
  const selectedAuthor = searchParams.get('author');
  const sort = searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    router.push(`/reviews?${next.toString()}`);
  }

  function toggleType(slug: string) {
    const next = selectedTypes.includes(slug) ? selectedTypes.filter((s) => s !== slug) : [...selectedTypes, slug];
    setParam('types', next.length > 0 ? next.join(',') : null);
  }

  return (
    <Paper shadow="sm" p={24} w={280} style={{ flexShrink: 0 }}>
      <Stack gap={24}>
        <Text fw={700} size="lg" ff="var(--font-nunito)">
          Filter
        </Text>

        <Stack gap={10}>
          <Text size="xs" fw={600} c="sand.6">
            Product type
          </Text>
          {productTypes.map((pt) => (
            <Checkbox
              key={pt.id}
              label={pt.name}
              color="coral"
              radius={6}
              checked={selectedTypes.includes(pt.slug)}
              onChange={() => toggleType(pt.slug)}
            />
          ))}
        </Stack>

        <Stack gap={8}>
          <Text size="xs" fw={600} c="sand.6">
            Authors
          </Text>
          {authors.map((author) => {
            const isSelected = selectedAuthor === String(author.id);
            return (
              <UnstyledButton
                key={author.id}
                onClick={() => setParam('author', isSelected ? null : String(author.id))}
                px={8}
                py={6}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderRadius: 100,
                  backgroundColor: isSelected ? 'var(--mantine-color-coral-1)' : 'transparent',
                }}
              >
                <Avatar size={28} color="coral" variant="filled">
                  {initials(author.name)}
                </Avatar>
                <Text size="sm" fw={isSelected ? 600 : 500}>
                  {author.name}
                </Text>
              </UnstyledButton>
            );
          })}
        </Stack>

        <Stack gap={10}>
          <Text size="xs" fw={600} c="sand.6">
            Sort
          </Text>
          <SegmentedControl
            fullWidth
            color="coral"
            radius="xl"
            value={sort}
            onChange={(value) => setParam('sort', value === 'oldest' ? 'oldest' : null)}
            data={[
              { value: 'newest', label: 'Newest' },
              { value: 'oldest', label: 'Oldest' },
            ]}
          />
        </Stack>
      </Stack>
    </Paper>
  );
}
