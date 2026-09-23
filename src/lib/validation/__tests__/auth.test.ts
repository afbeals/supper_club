import { describe, expect, it } from 'vitest';
import { loginSchema } from '../auth';

describe('loginSchema', () => {
  it('lowercases and trims the email', () => {
    const result = loginSchema.safeParse({ email: '  Writer@Example.com  ', password: 'anything' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('writer@example.com');
  });

  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'anything' }).success).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'writer@example.com', password: '' }).success).toBe(false);
  });
});
