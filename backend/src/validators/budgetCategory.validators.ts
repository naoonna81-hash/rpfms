import { z } from 'zod';

export const createBudgetCategorySchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  allocatedAmount: z.number().nonnegative().default(0),
  sortOrder: z.number().int().default(0),
});

export const updateBudgetCategorySchema = createBudgetCategorySchema.partial();
