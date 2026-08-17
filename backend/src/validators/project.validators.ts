import { z } from 'zod';

export const createProjectSchema = z.object({
  code: z.string().min(1),
  nameTh: z.string().min(1),
  nameEn: z.string().optional(),
  principalInvestigator: z.string().min(1),
  department: z.string().optional(),
  fiscalYear: z.number().int(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  totalBudget: z.number().nonnegative(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
  notes: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']).default('VIEWER'),
});

export const updateMemberSchema = z.object({
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']),
});

export const addFundingSchema = z.object({
  fundingSourceId: z.string().uuid().optional(),
  fundingSourceName: z.string().optional(),
  fundingSourceCode: z.string().optional(),
  amount: z.number().nonnegative(),
  notes: z.string().optional(),
}).refine((d) => d.fundingSourceId || d.fundingSourceName, {
  message: 'ต้องระบุ fundingSourceId หรือ fundingSourceName',
  path: ['fundingSourceId'],
});

export const workPackageSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  budgetAllocated: z.number().nonnegative().default(0),
});

export const updateWorkPackageSchema = workPackageSchema.partial();
