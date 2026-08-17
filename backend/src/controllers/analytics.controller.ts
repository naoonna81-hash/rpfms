import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError';
import { ok } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { computeCategorySummaries, computeProjectSummary, monthsBetween, SPENT_STATUSES } from '../services/budget.service';

function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === 'number' ? d : Number(d);
}

async function requireProjectId(req: Request) {
  const projectId = req.query.projectId as string | undefined;
  if (!projectId) throw ApiError.validation('ต้องระบุ projectId');
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw ApiError.notFound('ไม่พบโครงการ');
  return project;
}

export const burnRate = asyncHandler(async (req: Request, res: Response) => {
  const project = await requireProjectId(req);
  const expenses = await prisma.expense.findMany({
    where: { projectId: project.id, status: { in: [...SPENT_STATUSES] } },
    select: { date: true, amount: true },
  });

  const buckets = new Map<string, number>();
  for (const e of expenses) {
    const key = `${e.date.getFullYear()}-${(e.date.getMonth() + 1).toString().padStart(2, '0')}`;
    buckets.set(key, (buckets.get(key) ?? 0) + toNum(e.amount));
  }
  const totalMonths = monthsBetween(project.startDate, project.endDate);
  const plannedPerMonth = toNum(project.totalBudget) / totalMonths;

  // frontend/src/types/index.ts BurnRatePoint expects an array of {month, planned, actual} directly
  const monthly = [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, actual]) => ({ month, actual, planned: Math.round(plannedPerMonth * 100) / 100 }));

  return ok(res, monthly);
});

export const budgetUtilization = asyncHandler(async (req: Request, res: Response) => {
  const project = await requireProjectId(req);
  const summary = await computeProjectSummary(project.id);
  const byCategory = await computeCategorySummaries(project.id);
  return ok(res, {
    // legacy/extra fields (includes projectId, totalBudget, spentAmount, utilizationPct, ...)
    ...summary,
    // canonical field names consumed by frontend/src/types/index.ts BudgetUtilization
    // (placed after the spread so they take precedence under their own key names)
    totalSpent: summary.spentAmount,
    utilizationPercent: summary.utilizationPct,
    byCategory,
  });
});

export const topCategories = asyncHandler(async (req: Request, res: Response) => {
  const project = await requireProjectId(req);
  const limit = Math.min(20, parseInt((req.query.limit as string) ?? '5', 10) || 5);
  const byCategory = await computeCategorySummaries(project.id);
  const top = [...byCategory]
    .sort((a, b) => b.spentAmount - a.spentAmount)
    .slice(0, limit)
    .map((c) => ({
      // canonical field names consumed by frontend/src/types/index.ts TopCategory
      categoryId: c.id,
      categoryName: c.name,
      amount: c.spentAmount,
      // legacy/extra fields
      ...c,
    }));
  return ok(res, top);
});
