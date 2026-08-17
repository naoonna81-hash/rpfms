import { z } from 'zod';

export const createIncomeSchema = z.object({
  fundingSourceId: z.string().uuid().optional(),
  installment: z.string().min(1),
  receivedDate: z.coerce.date(),
  amount: z.number().nonnegative(),
  documentNo: z.string().optional(),
  notes: z.string().optional(),
});

export const updateIncomeSchema = createIncomeSchema.partial();
