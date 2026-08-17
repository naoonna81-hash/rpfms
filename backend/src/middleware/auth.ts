import { NextFunction, Request, Response } from 'express';
import { SystemRole, ProjectRole } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';

/**
 * Verifies the Authorization: Bearer <accessToken> header and attaches req.user.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('ต้องแนบ Access Token'));
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized('Access Token ไม่ถูกต้องหรือหมดอายุ'));
  }
}

/** Optional auth: attaches req.user if a valid token is present, otherwise continues anonymously. */
export function authenticateOptional(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    // ignore invalid token in optional mode
  }
  next();
}

/** Restrict to one or more SystemRole values. SUPER_ADMIN always implicitly allowed. */
export function requireSystemRole(...roles: SystemRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === 'SUPER_ADMIN' || roles.includes(req.user.role)) {
      return next();
    }
    next(ApiError.forbidden());
  };
}

const PROJECT_ROLE_RANK: Record<ProjectRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

/**
 * Requires the caller to be a member of the project (found via req.params[paramName])
 * with at least the given ProjectRole, OR a global ADMIN/SUPER_ADMIN (who bypass
 * per-project checks entirely). Attaches req.projectRole for downstream handlers.
 */
export function requireProjectRole(minRole: ProjectRole, paramName = 'id') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      return next();
    }
    const projectId = req.params[paramName];
    if (!projectId) return next(ApiError.validation('ไม่พบ projectId'));
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    });
    if (!membership) return next(ApiError.forbidden('คุณไม่ได้เป็นสมาชิกของโครงการนี้'));
    if (PROJECT_ROLE_RANK[membership.role] < PROJECT_ROLE_RANK[minRole]) {
      return next(ApiError.forbidden('สิทธิ์ในโครงการไม่เพียงพอ'));
    }
    (req as Request & { projectRole?: ProjectRole }).projectRole = membership.role;
    next();
  };
}

/** Requires the user to at least be a member (any role) of the project. */
export function requireProjectMember(paramName = 'id') {
  return requireProjectRole('VIEWER', paramName);
}
