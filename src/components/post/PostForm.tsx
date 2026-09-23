'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Slider,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { ImageDropzone, type UploadedImage } from '@/components/shared/ImageDropzone';
import { RichTextEditorField } from '@/components/shared/RichTextEditorField';

interface CriterionOption {
  id: number;
  name: string;
  minValue: number;
  maxValue: number;
}

interface ProductOption {
  id: number;
  name: string;
  subtitle: string;
  productType: { id: number; name: string; criteria: CriterionOption[] };
}

interface ProductTypeOption {
  id: number;
  name: string;
}

interface BulletValue {
  key: string;
  kind: 'PRO' | 'CON';
  text: string;
}

interface SubitemValue {
  key: string;
  label: string;
  notes: string;
  rating: number | null;
  images: UploadedImage[];
}

interface RatingValue {
  criterionId: number;
  value: number;
  note: string;
}

interface PostFormValues {
  title: string;
  summary: string;
  bodyHtml: string;
  productId: string;
  ratings: RatingValue[];
  bullets: BulletValue[];
  subitems: SubitemValue[];
  images: UploadedImage[];
}

export interface ExistingPost {
  id: number;
  title: string;
  summary: string;
  bodyHtml: string;
  productId: number;
  ratings: { criterionId: number; value: number; note: string }[];
  bullets: { kind: 'PRO' | 'CON'; text: string }[];
  images: UploadedImage[];
  subitems: { label: string; notes: string; rating: number | null; images: UploadedImage[] }[];
}

function randomKey(): string {
  return Math.random().toString(36).slice(2);
}

export function PostForm({ existingPost }: { existingPost?: ExistingPost }) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductOption[] | null>(null);
  const [productTypes, setProductTypes] = useState<ProductTypeOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

  const form = useForm<PostFormValues>({
    initialValues: existingPost
      ? {
          title: existingPost.title,
          summary: existingPost.summary,
          bodyHtml: existingPost.bodyHtml,
          productId: String(existingPost.productId),
          ratings: existingPost.ratings,
          bullets: existingPost.bullets.map((b) => ({ ...b, key: randomKey() })),
          subitems: existingPost.subitems.map((s) => ({ ...s, key: randomKey() })),
          images: existingPost.images,
        }
      : {
          title: '',
          summary: '',
          bodyHtml: '',
          productId: '',
          ratings: [],
          bullets: [],
          subitems: [],
          images: [],
        },
    validate: {
      title: (value) => (value.trim().length > 0 ? null : 'Title is required'),
      productId: (value) => (value ? null : 'Pick a product'),
    },
  });

  useEffect(() => {
    fetch('/api/products')
      .then((response) => response.json())
      .then((body: { products: ProductOption[]; productTypes: ProductTypeOption[] }) => {
        setProducts(body.products);
        setProductTypes(body.productTypes);
      })
      .catch(() => {
        notifications.show({ color: 'red', title: 'Failed to load products', message: 'Refresh and try again' });
      });
  }, []);

  const selectedProduct = products?.find((p) => String(p.id) === form.values.productId) ?? null;

  function handleProductChange(productId: string) {
    const product = products?.find((p) => String(p.id) === productId);
    form.setFieldValue('productId', productId);
    form.setFieldValue(
      'ratings',
      product
        ? product.productType.criteria.map((c) => ({
            criterionId: c.id,
            value: Math.round((c.minValue + c.maxValue) / 2),
            note: '',
          }))
        : [],
    );
  }

  function updateRating(criterionId: number, patch: Partial<RatingValue>) {
    form.setFieldValue(
      'ratings',
      form.values.ratings.map((r) => (r.criterionId === criterionId ? { ...r, ...patch } : r)),
    );
  }

  function addBullet(kind: 'PRO' | 'CON') {
    form.insertListItem('bullets', { key: randomKey(), kind, text: '' });
  }

  function addSubitem() {
    form.insertListItem('subitems', { key: randomKey(), label: '', notes: '', rating: null, images: [] });
  }

  async function refreshProductsAndSelect(productId: number) {
    const response = await fetch('/api/products');
    const body = (await response.json()) as { products: ProductOption[]; productTypes: ProductTypeOption[] };
    setProducts(body.products);
    setProductTypes(body.productTypes);
    handleProductChange(String(productId));
  }

  async function handleSave(status: 'DRAFT' | 'PUBLISHED') {
    const validation = form.validate();
    if (validation.hasErrors) {
      notifications.show({ color: 'red', title: 'Fix the highlighted fields', message: 'Some required fields are missing' });
      return;
    }

    const values = form.values;
    const payload = {
      status,
      title: values.title,
      summary: values.summary,
      bodyHtml: values.bodyHtml,
      images: values.images,
      productId: Number(values.productId),
      ratings: values.ratings,
      bullets: values.bullets.filter((b) => b.text.trim().length > 0).map(({ kind, text }) => ({ kind, text })),
      subitems: values.subitems
        .filter((s) => s.label.trim().length > 0)
        .map(({ label, notes, rating, images }) => ({ label, notes, rating, images })),
    };

    setSubmitting(true);
    const response = await fetch(existingPost ? `/api/posts/${existingPost.id}` : '/api/posts', {
      method: existingPost ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      notifications.show({ color: 'red', title: 'Failed to save', message: body?.error ?? 'Something went wrong' });
      return;
    }

    notifications.show({
      color: 'green',
      title: status === 'PUBLISHED' ? 'Published' : 'Draft saved',
      message: values.title,
    });
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <Stack maw={720} mx="auto" gap="lg">
      <Title order={2}>{existingPost ? 'Edit review' : 'New review'}</Title>

      <Paper shadow="sm" p="lg">
        <Stack>
          <TextInput label="Title" required {...form.getInputProps('title')} />
          <Textarea
            label="Summary / verdict"
            description="Shown in listings and at the top of the post"
            {...form.getInputProps('summary')}
          />
        </Stack>
      </Paper>

      <Paper shadow="sm" p="lg">
        <Stack>
          <SectionHeader color="coral" label="Product" />
          <Group align="flex-end">
            <Select
              label="Product"
              placeholder={products ? 'Pick a product' : 'Loading…'}
              required
              searchable
              disabled={!products}
              data={(products ?? []).map((p) => ({ value: String(p.id), label: `${p.name} (${p.productType.name})` }))}
              // Search only the product name, not the "(Book)"/"(Restaurant)"
              // product type suffix baked into the label — typing "restaurant"
              // shouldn't match every restaurant.
              filter={({ options, search }) => {
                const query = search.trim().toLowerCase();
                return options.filter((option) => {
                  if ('group' in option) return true;
                  const product = products?.find((p) => String(p.id) === option.value);
                  return product ? product.name.toLowerCase().includes(query) : false;
                });
              }}
              value={form.values.productId}
              onChange={(value) => value && handleProductChange(value)}
              error={form.errors.productId}
              flex={1}
            />
            <Button variant="default" onClick={() => setAddProductOpen(true)} disabled={!products}>
              Add new product
            </Button>
          </Group>

          {selectedProduct && selectedProduct.productType.criteria.length > 0 && (
            <Stack gap="sm">
              <Text size="sm" fw={600}>
                Ratings
              </Text>
              {selectedProduct.productType.criteria.map((criterion) => {
                const rating = form.values.ratings.find((r) => r.criterionId === criterion.id);
                return (
                  <div key={criterion.id}>
                    <Group justify="space-between" mb={6}>
                      <Text size="sm">{criterion.name}</Text>
                      <Badge color="coral" size="sm" variant="filled">
                        {rating?.value ?? criterion.minValue}
                      </Badge>
                    </Group>
                    <Slider
                      min={criterion.minValue}
                      max={criterion.maxValue}
                      step={1}
                      color="coral"
                      value={rating?.value ?? criterion.minValue}
                      onChange={(value) => updateRating(criterion.id, { value })}
                    />
                  </div>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper shadow="sm" p="lg">
        <Stack gap="sm">
          <SectionHeader color="sage" label="Pros & cons" />
          {form.values.bullets.map((bullet, index) => (
            <Group
              key={bullet.key}
              align="flex-end"
              p="xs"
              style={{
                backgroundColor: `var(--mantine-color-${bullet.kind === 'PRO' ? 'sage' : 'coral'}-0)`,
                borderRadius: 'var(--mantine-radius-sm)',
              }}
            >
              <Select
                data={[
                  { value: 'PRO', label: 'Pro' },
                  { value: 'CON', label: 'Con' },
                ]}
                value={bullet.kind}
                onChange={(value) => value && form.setFieldValue(`bullets.${index}.kind`, value)}
                w={100}
              />
              <TextInput flex={1} placeholder="e.g. Fast and reliable" {...form.getInputProps(`bullets.${index}.text`)} />
              <Button variant="subtle" color="red" onClick={() => form.removeListItem('bullets', index)}>
                <IconTrash size={16} />
              </Button>
            </Group>
          ))}
          <Group>
            <Button size="xs" variant="default" leftSection={<IconPlus size={14} />} onClick={() => addBullet('PRO')}>
              Add pro
            </Button>
            <Button size="xs" variant="default" leftSection={<IconPlus size={14} />} onClick={() => addBullet('CON')}>
              Add con
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper shadow="sm" p="lg">
        <Stack gap="sm">
          <SectionHeader color="sand" label="Chapters / items" />
          {form.values.subitems.map((subitem, index) => (
            <Paper key={subitem.key} shadow="sm" p="md" radius="md">
              <Stack gap="xs">
                <Group align="flex-end">
                  <TextInput
                    flex={1}
                    label="Label"
                    placeholder="Chapter 3 / Duck confit"
                    {...form.getInputProps(`subitems.${index}.label`)}
                  />
                  <NumberInput
                    label="Rating (optional)"
                    min={1}
                    max={10}
                    w={140}
                    value={subitem.rating ?? ''}
                    onChange={(value) =>
                      form.setFieldValue(`subitems.${index}.rating`, typeof value === 'number' ? value : null)
                    }
                  />
                  <Button variant="subtle" color="red" onClick={() => form.removeListItem('subitems', index)}>
                    <IconTrash size={16} />
                  </Button>
                </Group>
                <Textarea label="Notes" {...form.getInputProps(`subitems.${index}.notes`)} />
                <ImageDropzone
                  value={subitem.images}
                  onChange={(images) => form.setFieldValue(`subitems.${index}.images`, images)}
                />
              </Stack>
            </Paper>
          ))}
          <Button size="xs" variant="default" leftSection={<IconPlus size={14} />} onClick={addSubitem}>
            Add chapter / item
          </Button>
        </Stack>
      </Paper>

      <Paper shadow="sm" p="lg">
        <Stack>
          <SectionHeader color="coral" label="Your take" />
          <RichTextEditorField
            label="Body"
            value={form.values.bodyHtml}
            onChange={(html) => form.setFieldValue('bodyHtml', html)}
          />

          <Text size="sm" fw={600}>
            Photos
          </Text>
          <ImageDropzone value={form.values.images} onChange={(images) => form.setFieldValue('images', images)} />
        </Stack>
      </Paper>

      <Group justify="flex-end" mt="md">
        <Button variant="default" loading={submitting} onClick={() => handleSave('DRAFT')}>
          Save draft
        </Button>
        <Button loading={submitting} onClick={() => handleSave('PUBLISHED')}>
          Publish
        </Button>
      </Group>

      <AddProductModal
        opened={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        productTypes={productTypes}
        onCreated={refreshProductsAndSelect}
      />
    </Stack>
  );
}

function SectionHeader({ color, label }: { color: string; label: string }) {
  return (
    <Group gap="xs">
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: `var(--mantine-color-${color}-6)`,
        }}
      />
      <Text fw={700} size="sm">
        {label}
      </Text>
    </Group>
  );
}

interface AddProductFormValues {
  productTypeId: string;
  name: string;
  subtitle: string;
  url: string;
  description: string;
}

function AddProductModal({
  opened,
  onClose,
  productTypes,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  productTypes: ProductTypeOption[];
  onCreated: (productId: number) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<AddProductFormValues>({
    initialValues: { productTypeId: '', name: '', subtitle: '', url: '', description: '' },
    validate: {
      productTypeId: (value) => (value ? null : 'Pick a type'),
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
    },
  });

  async function handleSubmit(values: AddProductFormValues) {
    setSubmitting(true);
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, productTypeId: Number(values.productTypeId) }),
    });
    const body = (await response.json().catch(() => null)) as { product?: { id: number }; error?: string } | null;
    setSubmitting(false);

    if (!response.ok || !body?.product) {
      notifications.show({ color: 'red', title: 'Failed to create product', message: body?.error ?? 'Something went wrong' });
      return;
    }

    form.reset();
    onClose();
    onCreated(body.product.id);
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Add product">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            label="Type"
            required
            data={productTypes.map((pt) => ({ value: String(pt.id), label: pt.name }))}
            {...form.getInputProps('productTypeId')}
          />
          <TextInput label="Name" required {...form.getInputProps('name')} />
          <TextInput label="Subtitle" {...form.getInputProps('subtitle')} />
          <TextInput label="URL" {...form.getInputProps('url')} />
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
