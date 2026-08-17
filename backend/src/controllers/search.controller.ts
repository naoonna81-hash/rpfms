import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ok } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { visibleProjectIds } from '../utils/visibility';

export const search = asyncHandler(async (req: Request, res: Response) => {
  const { q, type, projectId, categoryId, fiscalYear, dateFrom, dateTo } = req.query as Record<string, string | undefined>;
  const scope = await visibleProjectIds(req);
  const searchType = type ?? 'all';

  const results: { projects: unknown[]; expenses: unknown[] } = { projects: [], expenses: [] };

  if (searchType === 'project' || searchType === 'all') {
    const where: Prisma.ProjectWhereInput = {};
    if (scope) where.id = { in: scope };
    if (projectId) where.id = projectId;
    if (fiscalYear) where.fiscalYear = parseInt(fiscalYear, 10);
    if (q) {
      where.OR = [
        { nameTh: { contains: q, mode: 'insensitive' } },
        { nameEn: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { principalInvestigator: { contains: q, mode: 'insensitive' } },
      ];
    }
    results.projects = await prisma.project.findMany({ where, take: 50, orderBy: { createdAt: 'desc' } });
  }

  if (searchType === 'expense' || searchType === 'all') {
    const where: Prisma.ExpenseWhereInput = {};
    if (scope) where.projectId = { in: scope };
    if (projectId) where.projectId = projectId;
    if (categoryId) where.categoryId = categoryId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    if (q) {
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { payee: { contains: q, mode: 'insensitive' } },
        { documentNo: { contains: q, mode: 'insensitive' } },
      ];
    }
    results.expenses = await prisma.expense.findMany({
      where,
      include: { project: { select: { id: true, code: true, nameTh: true } }, category: true },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });
  }

  return ok(res, results);
});
