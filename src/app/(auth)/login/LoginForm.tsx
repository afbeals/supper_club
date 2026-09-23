'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : 'Enter a valid email'),
      password: (value) => (value.length > 0 ? null : 'Password is required'),
    },
  });

  async function handleSubmit(values: LoginFormValues) {
    setSubmitting(true);
    setError(null);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'Something went wrong. Try again.');
      setSubmitting(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <Paper shadow="sm" p="xl" maw={420} mx="auto" mt="10vh">
      <Stack gap={4} mb="lg" align="center">
        <Title order={2}>Welcome back</Title>
        <Text c="sand.6" size="sm">
          Sign in to Supper Club
        </Text>
      </Stack>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}
          <TextInput
            label="Email"
            placeholder="you@example.com"
            required
            {...form.getInputProps('email')}
          />
          <PasswordInput label="Password" required {...form.getInputProps('password')} />
          <Button type="submit" loading={submitting} fullWidth size="md" mt="xs">
            Sign in
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
