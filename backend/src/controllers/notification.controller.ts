import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError';
import { ok, paginationMeta } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { generateNotifications } from '../services/notification.service';

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, sortField, sortDir } = parsePagination(req);
  const unreadOnly = req.query.unread === 'true';

  const where = { userId: req.user!.id, ...(unreadOnly ? { isRead: false } : {}) };
  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, skip, take: limit, orderBy: { [sortField]: sortDir } }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
  ]);

  return ok(res, items, { ...paginationMeta(page, limit, total), unreadCount });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification || notification.userId !== req.user!.id) throw ApiError.notFound('ไม่พบการแจ้งเตือน');

  const updated = await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } });
  return ok(res, updated);
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
  return ok(res, { updated: true });
});

export const triggerGenerate = asyncHandler(async (_req: Request, res: Response) => {
  const result = await generateNotifications();
  return ok(res, result);
});
