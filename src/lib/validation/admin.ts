import { z } from 'zod';

export const createProductTypeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).default(''),
});

export const createCriterionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).default(''),
  minValue: z.number().int().default(1),
  maxValue: z.number().int().default(10),
  higherIsBetter: z.boolean().default(true),
  weight: z.number().min(0).default(1),
});

export const createProductSchema = z.object({
  productTypeId: z.number().int(),
  name: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(200).default(''),
  url: z.string().trim().max(500).default(''),
  description: z.string().trim().max(1000).default(''),
});

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(200),
  role: z.enum(['ADMIN', 'WRITER']).default('WRITER'),
});

export const updateUserSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(['ADMIN', 'WRITER']).optional(),
});
