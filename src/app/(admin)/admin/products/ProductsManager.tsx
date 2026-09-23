'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, ProductType } from '@prisma/client';
import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';

type ProductWithType = Product & { productType: ProductType };

export function ProductsManager({
  initialProducts,
  productTypes,
}: {
  initialProducts: ProductWithType[];
  productTypes: ProductType[];
}) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Products</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateModalOpen(true)}
          disabled={productTypes.length === 0}
        >
          Add product
        </Button>
      </Group>

      {productTypes.length === 0 && (
        <Table.Caption>Create a product type first before adding products.</Table.Caption>
      )}

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Subtitle</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {initialProducts.map((product) => (
            <Table.Tr key={product.id}>
              <Table.Td>{product.name}</Table.Td>
              <Table.Td>{product.productType.name}</Table.Td>
              <Table.Td>{product.subtitle}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <CreateProductModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => router.refresh()}
        productTypes={productTypes}
      />
    </Stack>
  );
}

interface ProductFormValues {
  productTypeId: string;
  name: string;
  subtitle: string;
  url: string;
  description: string;
}

function CreateProductModal({
  opened,
  onClose,
  onCreated,
  productTypes,
}: {
  opened: boolean;
  onClose: () => void;
  onCreated: () => void;
  productTypes: ProductType[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ProductFormValues>({
    initialValues: { productTypeId: '', name: '', subtitle: '', url: '', description: '' },
    validate: {
      productTypeId: (value) => (value ? null : 'Pick a product type'),
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
    },
  });

  async function handleSubmit(values: ProductFormValues) {
    setSubmitting(true);
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, productTypeId: Number(values.productTypeId) }),
    });
    setSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      notifications.show({
        color: 'red',
        title: 'Failed to create product',
        message: body?.error ?? 'Something went wrong',
      });
      return;
    }

    form.reset();
    onClose();
    onCreated();
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Add product">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            label="Type"
            placeholder="Book, Restaurant, ..."
            required
            data={productTypes.map((pt) => ({ value: String(pt.id), label: pt.name }))}
            {...form.getInputProps('productTypeId')}
          />
          <TextInput label="Name" required {...form.getInputProps('name')} />
          <TextInput
            label="Subtitle"
            placeholder="by Andy Weir / Downtown, French-ish"
            {...form.getInputProps('subtitle')}
          />
          <TextInput label="URL" placeholder="https://..." {...form.getInputProps('url')} />
          <Textarea label="Description" {...form.getInputProps('description')} />
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
