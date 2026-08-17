import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

/** Expense statuses that count as "used" budget (approved for payment or already paid). */
export const SPENT_STATUSES = ['APPROVED', 'PAID'] as const;
export const PENDING_STATUSES = ['PENDING_STAFF', 'PENDING_LEAD'] as const;

function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === 'number' ? d : Number(d);
}

export interface ProjectBudgetSummary {
  projectId: string;
  totalBudget: number;
  spentAmount: number; // APPROVED + PAID
  paidAmount: number; // PAID only
  pendingAmount: number; // PENDING_STAFF + PENDING_LEAD
  remainingAmount: number;
  utilizationPct: number; // spentAmount / totalBudget * 100
  incomeReceived: number;
  monthsElapsed: number;
  monthsTotal: number;
  burnRatePerMonth: number; // spentAmount / monthsElapsed
  projectedTotalAtCurrentBurnRate: number | null;
}

export async function computeProjectSummary(projectId: string): Promise<ProjectBudgetSummary> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });

  const [spentAgg, paidAgg, pendingAgg, incomeAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: { projectId, status: { in: [...SPENT_STATUSES] } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({ where: { projectId, status: 'PAID' }, _sum: { amount: true } }),
    prisma.expense.aggregate({
      where: { projectId, status: { in: [...PENDING_STATUSES] } },
      _sum: { amount: true },
    }),
    prisma.income.aggregate({ where: { projectId }, _sum: { amount: true } }),
  ]);

  const totalBudget = toNum(project.totalBudget);
  const spentAmount = toNum(spentAgg._sum.amount);
  const paidAmount = toNum(paidAgg._sum.amount);
  const pendingAmount = toNum(pendingAgg._sum.amount);
  const incomeReceived = toNum(incomeAgg._sum.amount);
  const remainingAmount = totalBudget - spentAmount;
  const utilizationPct = totalBudget > 0 ? (spentAmount / totalBudget) * 100 : 0;

  const now = new Date();
  const start = project.startDate;
  const end = project.endDate;
  const monthsTotal = Math.max(1, monthsBetween(start, end));
  const elapsedEnd = now < end ? now : end;
  const monthsElapsed = Math.max(1, monthsBetween(start, elapsedEnd));
  const burnRatePerMonth = spentAmount / monthsElapsed;
  const projectedTotalAtCurrentBurnRate = burnRatePerMonth > 0 ? burnRatePerMonth * monthsTotal : null;

  return {
    projectId,
    totalBudget,
    spentAmount,
    paidAmount,
    pendingAmount,
    remainingAmount,
    utilizationPct: Math.round(utilizationPct * 100) / 100,
    incomeReceived,
    monthsElapsed,
    monthsTotal,
    burnRatePerMonth: Math.round(burnRatePerMonth * 100) / 100,
    projectedTotalAtCurrentBurnRate:
      projectedTotalAtCurrentBurnRate !== null ? Math.round(projectedTotalAtCurrentBurnRate * 100) / 100 : null,
  };
}

export function monthsBetween(start: Date, end: Date): number {
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    (end.getDate() >= start.getDate() ? 0 : -1);
  return Math.max(0, months) + 1;
}

export async function computeCategorySummaries(projectId: string) {
  const categories = await prisma.budgetCategory.findMany({
    where: { projectId },
    orderBy: { sortOrder: 'asc' },
  });

  const results = await Promise.all(
    categories.map(async (cat) => {
      const [spent, paid] = await Promise.all([
        prisma.expense.aggregate({
          where: { categoryId: cat.id, status: { in: [...SPENT_STATUSES] } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({ where: { categoryId: cat.id, status: 'PAID' }, _sum: { amount: true } }),
      ]);
      const allocatedAmount = toNum(cat.allocatedAmount);
      const spentAmount = toNum(spent._sum.amount);
      return {
        id: cat.id,
        name: cat.name,
        code: cat.code,
        allocatedAmount,
        spentAmount,
        paidAmount: toNum(paid._sum.amount),
        remainingAmount: allocatedAmount - spentAmount,
        utilizationPct: allocatedAmount > 0 ? Math.round((spentAmount / allocatedAmount) * 10000) / 100 : 0,
      };
    })
  );

  return results;
}
