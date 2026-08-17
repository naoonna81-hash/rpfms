import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuditAction } from '@prisma/client';

const METHOD_ACTION: Record<string, AuditAction> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Automatically writes an AuditLog row for every mutating request (POST/PUT/PATCH/DELETE)
 * that completes successfully (status < 400).
 *
 * Controllers may enrich the log by setting `req.auditContext` before responding, e.g.:
 *   req.auditContext = { entityType: 'expense', entityId: expense.id, oldValue: before, newValue: after };
 * Anything not explicitly set is inferred (entityType from the URL, action from the HTTP verb,
 * entityId from req.params.id or the response body's data.id, newValue from the response body).
 */
export function auditLogger(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING.has(req.method)) return next();

  const originalJson = res.json.bind(res);
  let capturedBody: unknown;
  res.json = ((body: unknown) => {
    capturedBody = body;
    return originalJson(body);
  }) as Response['json'];

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    writeAudit(req, capturedBody).catch((e) => {
      // eslint-disable-next-line no-console
      console.error('[AUDIT LOG ERROR]', e);
    });
  });

  next();
}

async function writeAudit(req: Request, body: unknown) {
  const ctx = req.auditContext ?? {};
  const entityType = ctx.entityType ?? inferEntityType(req.path);
  if (!entityType || entityType === 'auth') return; // skip login/register noise handled separately

  const action = (ctx.action as AuditAction | undefined) ?? METHOD_ACTION[req.method] ?? 'UPDATE';
  const responseData = (body as { data?: { id?: string } } | undefined)?.data;
  const entityId = ctx.entityId ?? req.params.id ?? responseData?.id ?? undefined;

  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action,
      entityType,
      entityId,
      oldValue: (ctx.oldValue ?? undefined) as never,
      newValue: (ctx.newValue ?? responseData ?? undefined) as never,
      ipAddress: req.ip,
    },
  });
}

function inferEntityType(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const idx = segments.findIndex((s) => s === 'v1');
  return segments[idx + 1] ?? segments[0] ?? 'unknown';
}
