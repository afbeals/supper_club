'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Table,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';

interface AdminUserRow {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'WRITER';
  active: boolean;
  createdAt: Date;
}

export function UsersManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUserRow[];
  currentUserId: number | null;
}) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  async function updateUser(id: number, data: { active?: boolean; role?: 'ADMIN' | 'WRITER' }) {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      notifications.show({ color: 'red', title: 'Failed', message: body?.error ?? 'Something went wrong' });
      return;
    }
    router.refresh();
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Users</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModalOpen(true)}>
          Add user
        </Button>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Role</Table.Th>
            <Table.Th>Active</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {initialUsers.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <Table.Tr key={user.id}>
                <Table.Td>
                  {user.name}
                  {isSelf && (
                    <Badge ml="xs" size="xs" variant="light">
                      You
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>{user.email}</Table.Td>
                <Table.Td>
                  <Select
                    size="xs"
                    w={110}
                    data={['ADMIN', 'WRITER']}
                    value={user.role}
                    disabled={isSelf}
                    onChange={(value) => value && updateUser(user.id, { role: value as 'ADMIN' | 'WRITER' })}
                  />
                </Table.Td>
                <Table.Td>
                  <Switch
                    checked={user.active}
                    disabled={isSelf}
                    onChange={(event) => updateUser(user.id, { active: event.currentTarget.checked })}
                  />
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      <CreateUserModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => router.refresh()}
      />
    </Stack>
  );
}

interface UserFormValues {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'WRITER';
}

function CreateUserModal({
  opened,
  onClose,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<UserFormValues>({
    initialValues: { email: '', name: '', password: '', role: 'WRITER' },
    validate: {
      email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : 'Enter a valid email'),
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
      password: (value) => (value.length >= 8 ? null : 'At least 8 characters'),
    },
  });

  async function handleSubmit(values: UserFormValues) {
    setSubmitting(true);
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    setSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      notifications.show({
        color: 'red',
        title: 'Failed to create user',
        message: body?.error ?? 'Something went wrong',
      });
      return;
    }

    form.reset();
    onClose();
    onCreated();
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Add user">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput label="Name" required {...form.getInputProps('name')} />
          <TextInput label="Email" required {...form.getInputProps('email')} />
          <PasswordInput label="Temporary password" required {...form.getInputProps('password')} />
          <Select label="Role" data={['ADMIN', 'WRITER']} {...form.getInputProps('role')} />
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
