import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError';
import { ok, paginationMeta } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { Prisma } from '@prisma/client';

const SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, sortField, sortDir } = parsePagination(req);
  const q = (req.query.q as string) ?? undefined;

  const where: Prisma.UserWhereInput = q
    ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: SELECT, skip, take: limit, orderBy: { [sortField]: sortDir } }),
    prisma.user.count({ where }),
  ]);

  return ok(res, items, paginationMeta(page, limit, total));
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: SELECT });
  if (!user) throw ApiError.notFound('ไม่พบผู้ใช้');
  return ok(res, user);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const before = await prisma.user.findUnique({ where: { id: req.params.id }, select: SELECT });
  if (!before) throw ApiError.notFound('ไม่พบผู้ใช้');

  const updated = await prisma.user.update({ where: { id: req.params.id }, data: req.body, select: SELECT });
  req.auditContext = { entityType: 'users', entityId: updated.id, oldValue: before, newValue: updated };
  return ok(res, updated);
});

export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const before = await prisma.user.findUnique({ where: { id: req.params.id }, select: SELECT });
  if (!before) throw ApiError.notFound('ไม่พบผู้ใช้');

  const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false }, select: SELECT });
  req.auditContext = { entityType: 'users', entityId: updated.id, action: 'DELETE', oldValue: before, newValue: updated };
  return ok(res, updated);
});
