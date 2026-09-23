import { describe, expect, it } from 'vitest';
import {
  createCriterionSchema,
  createProductSchema,
  createProductTypeSchema,
  createUserSchema,
  updateUserSchema,
} from '../admin';

describe('createProductTypeSchema', () => {
  it('accepts a minimal product type and defaults the description', () => {
    const result = createProductTypeSchema.safeParse({ name: 'Book' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBe('');
  });

  it('rejects an empty name', () => {
    expect(createProductTypeSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('createCriterionSchema', () => {
  it('fills in the standard 1-10, higher-is-better defaults', () => {
    const result = createCriterionSchema.safeParse({ name: 'Pacing' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minValue).toBe(1);
      expect(result.data.maxValue).toBe(10);
      expect(result.data.higherIsBetter).toBe(true);
      expect(result.data.weight).toBe(1);
    }
  });

  it('accepts an inverted, custom-weighted criterion', () => {
    const result = createCriterionSchema.safeParse({
      name: 'Price',
      minValue: 0,
      maxValue: 100,
      higherIsBetter: false,
      weight: 2.5,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.higherIsBetter).toBe(false);
  });

  it('rejects a negative weight', () => {
    expect(createCriterionSchema.safeParse({ name: 'Value', weight: -1 }).success).toBe(false);
  });
});

describe('createProductSchema', () => {
  const base = { productTypeId: 1, name: 'Project Hail Mary' };

  it('accepts a minimal product and defaults the optional text fields', () => {
    const result = createProductSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subtitle).toBe('');
      expect(result.data.url).toBe('');
      expect(result.data.description).toBe('');
    }
  });

  it('rejects a missing productTypeId', () => {
    const { productTypeId: _omit, ...withoutType } = base;
    expect(createProductSchema.safeParse(withoutType).success).toBe(false);
  });
});

describe('createUserSchema', () => {
  const base = { email: '  Admin@Example.com  ', name: 'Admin', password: 'longenoughpassword' };

  it('lowercases and trims the email, and defaults role to WRITER', () => {
    const result = createUserSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('admin@example.com');
      expect(result.data.role).toBe('WRITER');
    }
  });

  it('rejects a password under 8 characters', () => {
    expect(createUserSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(createUserSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('accepts an empty update (both fields optional)', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true);
  });

  it('accepts updating just active, or just role', () => {
    expect(updateUserSchema.safeParse({ active: false }).success).toBe(true);
    expect(updateUserSchema.safeParse({ role: 'ADMIN' }).success).toBe(true);
  });

  it('rejects an invalid role', () => {
    expect(updateUserSchema.safeParse({ role: 'OWNER' }).success).toBe(false);
  });
});
