import { z } from 'zod';

export const updateProfileSchema = z.object({
  bio: z.string().trim().max(500).default(''),
  avatarPath: z.string().trim().min(1).nullable().default(null),
});
