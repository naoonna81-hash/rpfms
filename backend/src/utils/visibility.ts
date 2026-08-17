import { Request } from 'express';
import { prisma } from '../lib/prisma';

/** Returns undefined (meaning "no restriction") for ADMIN/SUPER_ADMIN, or the list of project IDs a USER can see. */
export async function visibleProjectIds(req: Request): Promise<string[] | undefined> {
  if (req.user!.role !== 'USER') return undefined;
  const memberships = await prisma.projectMember.findMany({ where: { userId: req.user!.id }, select: { projectId: true } });
  return memberships.map((m) => m.projectId);
}
