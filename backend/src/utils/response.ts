import { Response } from 'express';

export interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export function ok(res: Response, data: unknown, meta?: Meta, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function created(res: Response, data: unknown, meta?: Meta) {
  return ok(res, data, meta, 201);
}

export function noContent(res: Response) {
  return res.status(204).send();
}

export function paginationMeta(page: number, limit: number, total: number): Meta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
