import { Request } from 'express';

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
  sortField: string;
  sortDir: 'asc' | 'desc';
}

export function parsePagination(req: Request, defaultSort = '-createdAt'): PageParams {
  const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
  const limitRaw = parseInt((req.query.limit as string) ?? '20', 10) || 20;
  const limit = Math.min(100, Math.max(1, limitRaw));
  const sort = (req.query.sort as string) ?? defaultSort;
  const sortDir: 'asc' | 'desc' = sort.startsWith('-') ? 'desc' : 'asc';
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  return { page, limit, skip: (page - 1) * limit, sortField, sortDir };
}
