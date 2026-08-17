import { ProjectRole, SystemRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from './apiError';

const PROJECT_ROLE_RANK: Record<ProjectRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

/**
 * Throws ApiError.forbidden unless the user is a global ADMIN/SUPER_ADMIN, or a member
 * of `projectId` with at least `minRole`. Returns the effective ProjectRole (or null for admins
 * who bypass membership).
 */
export async function assertProjectAccess(
  user: { id: string; role: SystemRole },
  projectId: string,
  minRole: ProjectRole
): Promise<ProjectRole | null> {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return null;

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (!membership) throw ApiError.forbidden('คุณไม่ได้เป็นสมาชิกของโครงการนี้');
  if (PROJECT_ROLE_RANK[membership.role] < PROJECT_ROLE_RANK[minRole]) {
    throw ApiError.forbidden('สิทธิ์ในโครงการไม่เพียงพอ');
  }
  return membership.role;
}

export { PROJECT_ROLE_RANK };
