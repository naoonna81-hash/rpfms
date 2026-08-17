import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
  q: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']).optional(),
  isActive: z.boolean().optional(),
});
