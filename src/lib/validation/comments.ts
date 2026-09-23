import { z } from 'zod';

export const createCommentSchema = z.object({
  postId: z.number().int(),
  parentId: z.number().int().nullable().default(null),
  bodyText: z.string().trim().min(1).max(2000),
});
