import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError';
import { created, noContent, ok } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await prisma.budgetCategory.findMany({
    where: { projectId: req.params.id },
    orderBy: { sortOrder: 'asc' },
  });
  return ok(res, categories);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw ApiError.notFound('ไม่พบโครงการ');

  const existing = await prisma.budgetCategory.findUnique({
    where: { projectId_name: { projectId, name: req.body.name } },
  });
  if (existing) throw ApiError.conflict('มีหมวดงบประมาณชื่อนี้อยู่แล้วในโครงการ');

  const category = await prisma.budgetCategory.create({ data: { ...req.body, projectId } });
  req.auditContext = { entityType: 'budget_categories', entityId: category.id, newValue: category };
  return created(res, category);
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const before = await prisma.budgetCategory.findFirst({ where: { id: req.params.categoryId, projectId: req.params.id } });
  if (!before) throw ApiError.notFound('ไม่พบหมวดงบประมาณ');

  const updated = await prisma.budgetCategory.update({ where: { id: before.id }, data: req.body });
  req.auditContext = { entityType: 'budget_categories', entityId: updated.id, oldValue: before, newValue: updated };
  return ok(res, updated);
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const before = await prisma.budgetCategory.findFirst({ where: { id: req.params.categoryId, projectId: req.params.id } });
  if (!before) throw ApiError.notFound('ไม่พบหมวดงบประมาณ');

  const expenseCount = await prisma.expense.count({ where: { categoryId: before.id } });
  if (expenseCount > 0) throw ApiError.conflict('ไม่สามารถลบหมวดงบประมาณที่มีรายการเบิกจ่ายผูกอยู่ได้');

  await prisma.budgetCategory.delete({ where: { id: before.id } });
  req.auditContext = { entityType: 'budget_categories', entityId: before.id, action: 'DELETE', oldValue: before };
  return noContent(res);
});
