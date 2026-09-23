'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductType, RatingCriterion } from '@prisma/client';
import {
  ActionIcon,
  Accordion,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArchive, IconArchiveOff, IconPlus } from '@tabler/icons-react';

type ProductTypeWithCriteria = ProductType & { criteria: RatingCriterion[] };

async function postJson<T>(url: string, body: unknown): Promise<{ data?: T; error?: string }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    return { error: json?.error ?? 'Something went wrong' };
  }
  return { data: json as T };
}

async function patchJson<T>(url: string, body: unknown): Promise<{ data?: T; error?: string }> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    return { error: json?.error ?? 'Something went wrong' };
  }
  return { data: json as T };
}

export function ProductTypesManager({
  initialProductTypes,
}: {
  initialProductTypes: ProductTypeWithCriteria[];
}) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  async function handleArchiveProductType(id: number, archived: boolean) {
    const result = await patchJson(`/api/admin/product-types/${id}`, { archived });
    if (result.error) {
      notifications.show({ color: 'red', title: 'Failed', message: result.error });
      return;
    }
    router.refresh();
  }

  async function handleArchiveCriterion(id: number, archived: boolean) {
    const result = await patchJson(`/api/admin/criteria/${id}`, { archived });
    if (result.error) {
      notifications.show({ color: 'red', title: 'Failed', message: result.error });
      return;
    }
    router.refresh();
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Product Types</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModalOpen(true)}>
          Add product type
        </Button>
      </Group>

      <Accordion variant="separated">
        {initialProductTypes.map((productType) => (
          <Accordion.Item key={productType.id} value={String(productType.id)}>
            <Accordion.Control>
              <Group justify="space-between" pr="md">
                <Group gap="xs">
                  <Text fw={500}>{productType.name}</Text>
                  {productType.archivedAt && (
                    <Badge color="gray" size="sm">
                      Archived
                    </Badge>
                  )}
                </Group>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack>
                {productType.description && (
                  <Text size="sm" c="dimmed">
                    {productType.description}
                  </Text>
                )}
                <CriteriaTable
                  productType={productType}
                  onArchiveCriterion={handleArchiveCriterion}
                  onRefresh={() => router.refresh()}
                />
                <Group justify="flex-end">
                  <Button
                    variant="light"
                    color={productType.archivedAt ? 'green' : 'red'}
                    leftSection={
                      productType.archivedAt ? <IconArchiveOff size={16} /> : <IconArchive size={16} />
                    }
                    size="xs"
                    onClick={() => handleArchiveProductType(productType.id, !productType.archivedAt)}
                  >
                    {productType.archivedAt ? 'Unarchive' : 'Archive'} product type
                  </Button>
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>

      <CreateProductTypeModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => router.refresh()}
      />
    </Stack>
  );
}

function CriteriaTable({
  productType,
  onArchiveCriterion,
  onRefresh,
}: {
  productType: ProductTypeWithCriteria;
  onArchiveCriterion: (id: number, archived: boolean) => void;
  onRefresh: () => void;
}) {
  const [addingCriterion, setAddingCriterion] = useState(false);

  return (
    <Stack gap="xs">
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Criterion</Table.Th>
            <Table.Th>Range</Table.Th>
            <Table.Th>Higher is better</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {productType.criteria.map((criterion) => (
            <Table.Tr key={criterion.id}>
              <Table.Td>
                {criterion.name}
                {criterion.archivedAt && (
                  <Badge ml="xs" size="xs" color="gray">
                    Archived
                  </Badge>
                )}
              </Table.Td>
              <Table.Td>
                {criterion.minValue}
                {'–'}
                {criterion.maxValue}
              </Table.Td>
              <Table.Td>{criterion.higherIsBetter ? 'Yes' : 'No'}</Table.Td>
              <Table.Td>
                <ActionIcon
                  variant="subtle"
                  color={criterion.archivedAt ? 'green' : 'red'}
                  onClick={() => onArchiveCriterion(criterion.id, !criterion.archivedAt)}
                  aria-label={criterion.archivedAt ? 'Unarchive criterion' : 'Archive criterion'}
                >
                  {criterion.archivedAt ? <IconArchiveOff size={16} /> : <IconArchive size={16} />}
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {addingCriterion ? (
        <AddCriterionForm
          productTypeId={productType.id}
          onDone={() => {
            setAddingCriterion(false);
            onRefresh();
          }}
          onCancel={() => setAddingCriterion(false)}
        />
      ) : (
        <Button variant="subtle" size="xs" onClick={() => setAddingCriterion(true)}>
          + Add criterion
        </Button>
      )}
    </Stack>
  );
}

interface CriterionFormValues {
  name: string;
  minValue: number;
  maxValue: number;
  higherIsBetter: boolean;
  weight: number;
}

function AddCriterionForm({
  productTypeId,
  onDone,
  onCancel,
}: {
  productTypeId: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<CriterionFormValues>({
    initialValues: { name: '', minValue: 1, maxValue: 10, higherIsBetter: true, weight: 1 },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
    },
  });

  async function handleSubmit(values: CriterionFormValues) {
    setSubmitting(true);
    const result = await postJson(`/api/admin/product-types/${productTypeId}/criteria`, values);
    setSubmitting(false);
    if (result.error) {
      notifications.show({ color: 'red', title: 'Failed to add criterion', message: result.error });
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Group align="flex-end">
        <TextInput label="Name" placeholder="Atmosphere" required {...form.getInputProps('name')} />
        <NumberInput label="Min" w={80} {...form.getInputProps('minValue')} />
        <NumberInput label="Max" w={80} {...form.getInputProps('maxValue')} />
        <Switch
          label="Higher is better"
          checked={form.values.higherIsBetter}
          onChange={(event) => form.setFieldValue('higherIsBetter', event.currentTarget.checked)}
        />
        <Button type="submit" loading={submitting} size="sm">
          Add
        </Button>
        <Button type="button" variant="subtle" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </Group>
    </form>
  );
}

interface ProductTypeFormValues {
  name: string;
  description: string;
}

function CreateProductTypeModal({
  opened,
  onClose,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ProductTypeFormValues>({
    initialValues: { name: '', description: '' },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
    },
  });

  async function handleSubmit(values: ProductTypeFormValues) {
    setSubmitting(true);
    const result = await postJson('/api/admin/product-types', values);
    setSubmitting(false);
    if (result.error) {
      notifications.show({ color: 'red', title: 'Failed to create product type', message: result.error });
      return;
    }
    form.reset();
    onClose();
    onCreated();
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Add product type">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput label="Name" placeholder="Book" required {...form.getInputProps('name')} />
          <TextInput
            label="Description"
            placeholder="Novels, non-fiction, anything with a spine."
            {...form.getInputProps('description')}
          />
          <Group justify="flex-end">
            <Button type="submit" loading={submitting}>
              Create
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
