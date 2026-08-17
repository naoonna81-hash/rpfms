import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ok } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { visibleProjectIds } from '../utils/visibility';
import { SPENT_STATUSES } from '../services/budget.service';

function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === 'number' ? d : Number(d);
}

/** fiscalYear is stored and queried as the Thai Buddhist-era year (e.g. 2569) — no ± 543 conversion anywhere. */
function fiscalYearFilter(req: Request): number | undefined {
  const raw = req.query.fiscalYear as string | undefined;
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

export const dashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const projectIds = await visibleProjectIds(req);
  const fiscalYear = fiscalYearFilter(req);
  const projectWhere: Prisma.ProjectWhereInput = {
    ...(projectIds ? { id: { in: projectIds } } : {}),
    ...(fiscalYear ? { fiscalYear } : {}),
  };
  const expenseWhere: Prisma.ExpenseWhereInput = {
    ...(projectIds ? { projectId: { in: projectIds } } : {}),
    ...(fiscalYear ? { project: { fiscalYear } } : {}),
  };

  const [projectCount, budgetAgg, spentAgg, paidAgg, expenseCount, pendingCount] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    prisma.project.aggregate({ where: projectWhere, _sum: { totalBudget: true } }),
    prisma.expense.aggregate({ where: { ...expenseWhere, status: { in: [...SPENT_STATUSES] } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { ...expenseWhere, status: 'PAID' }, _sum: { amount: true } }),
    prisma.expense.count({ where: expenseWhere }),
    prisma.expense.count({ where: { ...expenseWhere, status: { in: ['PENDING_STAFF', 'PENDING_LEAD'] } } }),
  ]);

  const totalBudget = toNum(budgetAgg._sum.totalBudget);
  const spentAmount = toNum(spentAgg._sum.amount);
  const remainingAmount = totalBudget - spentAmount;

  return ok(res, {
    // canonical field names consumed by frontend/src/types/index.ts DashboardSummary
    totalProjects: projectCount,
    totalBudget,
    totalSpent: spentAmount,
    totalRemaining: remainingAmount,
    totalExpenseCount: expenseCount,
    // extra/legacy aliases kept for any other consumers
    projectCount,
    spentAmount,
    paidAmount: toNum(paidAgg._sum.amount),
    remainingAmount,
    utilizationPct: totalBudget > 0 ? Math.round((spentAmount / totalBudget) * 10000) / 100 : 0,
    expenseCount,
    pendingApprovalCount: pendingCount,
  });
});

export const dashboardMonthly = asyncHandler(async (req: Request, res: Response) => {
  const projectIds = await visibleProjectIds(req);
  const fiscalYear = fiscalYearFilter(req);
  const { projectId } = req.query as { projectId?: string };

  const where: Prisma.ExpenseWhereInput = { status: { in: [...SPENT_STATUSES] } };
  if (projectId) where.projectId = projectId;
  else if (projectIds) where.projectId = { in: projectIds };
  if (fiscalYear) where.project = { fiscalYear };

  const expenses = await prisma.expense.findMany({ where, select: { date: true, amount: true } });
  const buckets = new Map<string, number>();
  for (const e of expenses) {
    const key = `${e.date.getFullYear()}-${(e.date.getMonth() + 1).toString().padStart(2, '0')}`;
    buckets.set(key, (buckets.get(key) ?? 0) + toNum(e.amount));
  }
  const months = [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, total]) => ({ month, amount: total, total }));
  return ok(res, months);
});

export const dashboardByCategory = asyncHandler(async (req: Request, res: Response) => {
  const projectIds = await visibleProjectIds(req);
  const fiscalYear = fiscalYearFilter(req);
  const { projectId } = req.query as { projectId?: string };

  const where: Prisma.ExpenseWhereInput = { status: { in: [...SPENT_STATUSES] } };
  if (projectId) where.projectId = projectId;
  else if (projectIds) where.projectId = { in: projectIds };
  if (fiscalYear) where.project = { fiscalYear };

  const expenses = await prisma.expense.findMany({
    where,
    select: { amount: true, category: { select: { id: true, name: true, allocatedAmount: true } } },
  });
  const buckets = new Map<
    string,
    { categoryId: string; name: string; allocatedAmount: number; total: number }
  >();
  for (const e of expenses) {
    const key = e.category.id;
    const existing = buckets.get(key);
    if (existing) existing.total += toNum(e.amount);
    else
      buckets.set(key, {
        categoryId: key,
        name: e.category.name,
        allocatedAmount: toNum(e.category.allocatedAmount),
        total: toNum(e.amount),
      });
  }
  const result = [...buckets.values()]
    .sort((a, b) => b.total - a.total)
    .map((b) => ({
      // canonical field names consumed by frontend/src/types/index.ts CategoryBreakdown
      categoryId: b.categoryId,
      categoryName: b.name,
      allocatedAmount: b.allocatedAmount,
      spentAmount: b.total,
      // legacy aliases
      name: b.name,
      total: b.total,
    }));
  return ok(res, result);
});

export const dashboardByProject = asyncHandler(async (req: Request, res: Response) => {
  const projectIds = await visibleProjectIds(req);
  const fiscalYear = fiscalYearFilter(req);
  const where: Prisma.ProjectWhereInput = {
    ...(projectIds ? { id: { in: projectIds } } : {}),
    ...(fiscalYear ? { fiscalYear } : {}),
  };

  const projects = await prisma.project.findMany({ where, select: { id: true, code: true, nameTh: true, totalBudget: true } });
  const results = await Promise.all(
    projects.map(async (p) => {
      const agg = await prisma.expense.aggregate({
        where: { projectId: p.id, status: { in: [...SPENT_STATUSES] } },
        _sum: { amount: true },
      });
      const spent = toNum(agg._sum.amount);
      const totalBudget = toNum(p.totalBudget);
      return {
        // canonical field names consumed by frontend/src/types/index.ts ProjectBreakdown
        projectId: p.id,
        projectName: p.nameTh,
        totalBudget,
        spentAmount: spent,
        // legacy aliases
        code: p.code,
        nameTh: p.nameTh,
        remainingAmount: totalBudget - spent,
        utilizationPct: totalBudget > 0 ? Math.round((spent / totalBudget) * 10000) / 100 : 0,
      };
    })
  );
  return ok(res, results);
});
