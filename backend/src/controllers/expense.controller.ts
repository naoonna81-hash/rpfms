import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError';
import { created, noContent, ok, paginationMeta } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { assertProjectAccess } from '../utils/access';
import { env } from '../config/env';
import { fileTypeFromMime } from '../middleware/upload';
import { extractFromDocument } from '../services/ocr.service';

const EXPENSE_INCLUDE = {
  category: true,
  workPackage: true,
  submittedBy: { select: { id: true, name: true, email: true } },
  files: true,
  approvals: { include: { approver: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ExpenseInclude;

export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, sortField, sortDir } = parsePagination(req);
  const { projectId, categoryId, status, dateFrom, dateTo, q } = req.query as Record<string, string | undefined>;

  const where: Prisma.ExpenseWhereInput = {};
  if (projectId) {
    await assertProjectAccess(req.user!, projectId, 'VIEWER');
    where.projectId = projectId;
  } else if (req.user!.role === 'USER') {
    // Restrict to projects the user is a member of
    const memberships = await prisma.projectMember.findMany({ where: { userId: req.user!.id }, select: { projectId: true } });
    where.projectId = { in: memberships.map((m) => m.projectId) };
  }
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status as never;
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

  const [items, total] = await Promise.all([
    prisma.expense.findMany({ where, include: EXPENSE_INCLUDE, skip, take: limit, orderBy: { [sortField]: sortDir } }),
    prisma.expense.count({ where }),
  ]);

  return ok(res, items, paginationMeta(page, limit, total));
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const { projectId, categoryId, workPackageId } = req.body as { projectId: string; categoryId: string; workPackageId?: string };
  await assertProjectAccess(req.user!, projectId, 'EDITOR');

  const category = await prisma.budgetCategory.findFirst({ where: { id: categoryId, projectId } });
  if (!category) throw ApiError.validation('หมวดงบประมาณไม่ถูกต้องหรือไม่อยู่ในโครงการนี้');

  if (workPackageId) {
    const wp = await prisma.workPackage.findFirst({ where: { id: workPackageId, projectId } });
    if (!wp) throw ApiError.validation('Work Package ไม่ถูกต้องหรือไม่อยู่ในโครงการนี้');
  }

  const expense = await prisma.expense.create({
    data: { ...req.body, submittedById: req.user!.id, status: 'DRAFT' },
    include: EXPENSE_INCLUDE,
  });

  req.auditContext = { entityType: 'expenses', entityId: expense.id, newValue: expense };
  return created(res, expense);
});

async function loadExpenseOr404(id: string) {
  const expense = await prisma.expense.findUnique({ where: { id }, include: EXPENSE_INCLUDE });
  if (!expense) throw ApiError.notFound('ไม่พบรายการเบิกจ่าย');
  return expense;
}

export const getExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await loadExpenseOr404(req.params.id);
  await assertProjectAccess(req.user!, expense.projectId, 'VIEWER');
  return ok(res, expense);
});

export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const before = await loadExpenseOr404(req.params.id);
  await assertProjectAccess(req.user!, before.projectId, 'EDITOR');

  if (!['DRAFT', 'REJECTED'].includes(before.status)) {
    throw ApiError.conflict('แก้ไขได้เฉพาะรายการที่เป็นสถานะ DRAFT หรือ REJECTED เท่านั้น');
  }

  if (req.body.categoryId) {
    const category = await prisma.budgetCategory.findFirst({ where: { id: req.body.categoryId, projectId: before.projectId } });
    if (!category) throw ApiError.validation('หมวดงบประมาณไม่ถูกต้องหรือไม่อยู่ในโครงการนี้');
  }

  const updated = await prisma.expense.update({ where: { id: before.id }, data: req.body, include: EXPENSE_INCLUDE });
  req.auditContext = { entityType: 'expenses', entityId: updated.id, oldValue: before, newValue: updated };
  return ok(res, updated);
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const before = await loadExpenseOr404(req.params.id);
  await assertProjectAccess(req.user!, before.projectId, 'EDITOR');

  if (before.status !== 'DRAFT') throw ApiError.conflict('ลบได้เฉพาะรายการที่เป็นสถานะ DRAFT เท่านั้น');

  await prisma.expense.delete({ where: { id: before.id } });
  req.auditContext = { entityType: 'expenses', entityId: before.id, action: 'DELETE', oldValue: before };
  return noContent(res);
});

export const submitExpense = asyncHandler(async (req: Request, res: Response) => {
  const before = await loadExpenseOr404(req.params.id);
  await assertProjectAccess(req.user!, before.projectId, 'EDITOR');

  if (!['DRAFT', 'REJECTED'].includes(before.status)) {
    throw ApiError.conflict('ส่งเข้า workflow ได้เฉพาะรายการที่เป็นสถานะ DRAFT หรือ REJECTED เท่านั้น');
  }

  const updated = await prisma.expense.update({
    where: { id: before.id },
    data: { status: 'PENDING_STAFF' },
    include: EXPENSE_INCLUDE,
  });

  req.auditContext = { entityType: 'expenses', entityId: updated.id, action: 'UPDATE', oldValue: before, newValue: updated };
  return ok(res, updated);
});

// ---- Files ---------------------------------------------------------------

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  const expense = await loadExpenseOr404(req.params.id);
  await assertProjectAccess(req.user!, expense.projectId, 'EDITOR');

  const file = req.file;
  if (!file) throw ApiError.validation('ไม่พบไฟล์แนบ');

  const relativeUrl = path.relative(env.uploadDir, file.path).split(path.sep).join('/');
  const expenseFile = await prisma.expenseFile.create({
    data: {
      expenseId: expense.id,
      fileUrl: `/uploads/${relativeUrl}`,
      fileType: fileTypeFromMime(file.mimetype),
      originalName: file.originalname,
    },
  });

  req.auditContext = { entityType: 'expense_files', entityId: expenseFile.id, newValue: expenseFile };
  return created(res, expenseFile);
});

export const runOcr = asyncHandler(async (req: Request, res: Response) => {
  const expense = await loadExpenseOr404(req.params.id);
  await assertProjectAccess(req.user!, expense.projectId, 'EDITOR');

  const expenseFile = await prisma.expenseFile.findFirst({ where: { id: req.params.fileId, expenseId: expense.id } });
  if (!expenseFile) throw ApiError.notFound('ไม่พบไฟล์แนบ');

  const relPath = expenseFile.fileUrl.replace(/^\/uploads\//, '');
  const absPath = path.join(env.uploadDir, relPath);
  if (!fs.existsSync(absPath)) throw ApiError.notFound('ไม่พบไฟล์บนเซิร์ฟเวอร์');

  const result = await extractFromDocument(absPath);

  const updated = await prisma.expenseFile.update({
    where: { id: expenseFile.id },
    data: { ocrText: result.text, ocrExtractedData: result.fields as unknown as Prisma.InputJsonValue },
  });

  req.auditContext = { entityType: 'expense_files', entityId: updated.id, action: 'UPDATE', newValue: { ocrExtractedData: result.fields } };
  return ok(res, { id: updated.id, ocrText: updated.ocrText, fields: result.fields });
});

export const deleteFile = asyncHandler(async (req: Request, res: Response) => {
  const expense = await loadExpenseOr404(req.params.id);
  await assertProjectAccess(req.user!, expense.projectId, 'EDITOR');

  const expenseFile = await prisma.expenseFile.findFirst({ where: { id: req.params.fileId, expenseId: expense.id } });
  if (!expenseFile) throw ApiError.notFound('ไม่พบไฟล์แนบ');

  await prisma.expenseFile.delete({ where: { id: expenseFile.id } });

  const relPath = expenseFile.fileUrl.replace(/^\/uploads\//, '');
  const absPath = path.join(env.uploadDir, relPath);
  fs.promises.unlink(absPath).catch(() => undefined);

  req.auditContext = { entityType: 'expense_files', entityId: expenseFile.id, action: 'DELETE', oldValue: expenseFile };
  return noContent(res);
});
