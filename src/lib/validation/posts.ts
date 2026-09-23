import { z } from 'zod';

const uploadedImageSchema = z.object({
  path: z.string().min(1),
  thumbPath: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mimeType: z.string().min(1),
  byteSize: z.number().int().positive(),
  caption: z.string().trim().max(300).default(''),
});

const ratingInputSchema = z.object({
  criterionId: z.number().int(),
  value: z.number().int(),
  note: z.string().trim().max(500).default(''),
});

const bulletInputSchema = z.object({
  kind: z.enum(['PRO', 'CON']),
  text: z.string().trim().min(1).max(300),
});

// Subitem.rating is a bare 1-10 int, independent of the parent review's own
// configurable criteria (see schema.prisma comment on the Subitem model).
const subitemInputSchema = z.object({
  label: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).default(''),
  rating: z.number().int().min(1).max(10).nullable().default(null),
  images: z.array(uploadedImageSchema).default([]),
});

export const createPostSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED']),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(500).default(''),
  bodyHtml: z.string().default(''),
  images: z.array(uploadedImageSchema).default([]),
  productId: z.number().int(),
  ratings: z.array(ratingInputSchema).default([]),
  bullets: z.array(bulletInputSchema).default([]),
  subitems: z.array(subitemInputSchema).default([]),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const setPostStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED']),
});
