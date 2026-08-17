import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError';
import { created, noContent, ok, paginationMeta } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';

export const listIncomes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, sortField, sortDir } = parsePagination(req, '-receivedDate');
  const projectId = req.params.id;

  const [items, total] = await Promise.all([
    prisma.income.findMany({
      where: { projectId },
      include: { fundingSource: true },
      skip,
      take: limit,
      orderBy: { [sortField]: sortDir },
    }),
    prisma.income.count({ where: { projectId } }),
  ]);

  return ok(res, items, paginationMeta(page, limit, total));
});

export const createIncome = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw ApiError.notFound('ไม่พบโครงการ');

  const income = await prisma.income.create({ data: { ...req.body, projectId }, include: { fundingSource: true } });
  req.auditContext = { entityType: 'incomes', entityId: income.id, newValue: income };
  return created(res, income);
});

export const getIncome = asyncHandler(async (req: Request, res: Response) => {
  const income = await prisma.income.findFirst({
    where: { id: req.params.incomeId, projectId: req.params.id },
    include: { fundingSource: true },
  });
  if (!income) throw ApiError.notFound('ไม่พบรายการรายรับ');
  return ok(res, income);
});

export const updateIncome = asyncHandler(async (req: Request, res: Response) => {
  const before = await prisma.income.findFirst({ where: { id: req.params.incomeId, projectId: req.params.id } });
  if (!before) throw ApiError.notFound('ไม่พบรายการรายรับ');

  const updated = await prisma.income.update({ where: { id: before.id }, data: req.body, include: { fundingSource: true } });
  req.auditContext = { entityType: 'incomes', entityId: updated.id, oldValue: before, newValue: updated };
  return ok(res, updated);
});

export const deleteIncome = asyncHandler(async (req: Request, res: Response) => {
  const before = await prisma.income.findFirst({ where: { id: req.params.incomeId, projectId: req.params.id } });
  if (!before) throw ApiError.notFound('ไม่พบรายการรายรับ');

  await prisma.income.delete({ where: { id: before.id } });
  req.auditContext = { entityType: 'incomes', entityId: before.id, action: 'DELETE', oldValue: before };
  return noContent(res);
});
