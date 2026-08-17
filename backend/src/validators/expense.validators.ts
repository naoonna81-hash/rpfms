import { z } from 'zod';

export const createExpenseSchema = z.object({
  projectId: z.string().uuid(),
  categoryId: z.string().uuid(),
  workPackageId: z.string().uuid().optional().nullable(),
  date: z.coerce.date(),
  documentNo: z.string().optional(),
  description: z.string().min(1),
  amount: z.number().positive(),
  payee: z.string().min(1),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'OTHER']).default('BANK_TRANSFER'),
});

export const updateExpenseSchema = createExpenseSchema.partial().omit({ projectId: true });

export const listExpensesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
  projectId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PENDING_STAFF', 'PENDING_LEAD', 'APPROVED', 'REJECTED', 'PAID']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  q: z.string().optional(),
});

export const approvalActionSchema = z.object({
  comment: z.string().optional(),
});
