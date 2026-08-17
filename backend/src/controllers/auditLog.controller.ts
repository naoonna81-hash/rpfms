import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ok, paginationMeta } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, sortField, sortDir } = parsePagination(req);
  const { entityType, entityId, userId, dateFrom, dateTo } = req.query as Record<string, string | undefined>;

  const where: Prisma.AuditLogWhereInput = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      skip,
      take: limit,
      orderBy: { [sortField]: sortDir },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return ok(res, items, paginationMeta(page, limit, total));
});
