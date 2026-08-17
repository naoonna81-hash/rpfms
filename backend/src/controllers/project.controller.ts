import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError';
import { ok, created, noContent, paginationMeta } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { computeCategorySummaries, computeProjectSummary } from '../services/budget.service';

const PROJECT_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
  members: { include: { user: { select: { id: true, name: true, email: true } } } },
  fundings: { include: { fundingSource: true } },
} satisfies Prisma.ProjectInclude;

export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, sortField, sortDir } = parsePagination(req);
  const { fiscalYear, status, q } = req.query as { fiscalYear?: string; status?: string; q?: string };

  const where: Prisma.ProjectWhereInput = {};
  if (fiscalYear) where.fiscalYear = parseInt(fiscalYear, 10);
  if (status) where.status = status as never;
  if (q) {
    where.OR = [
      { nameTh: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
      { code: { contains: q, mode: 'insensitive' } },
      { principalInvestigator: { contains: q, mode: 'insensitive' } },
    ];
  }

  // Non admin users only see projects they're a member of
  if (req.user!.role === 'USER') {
    where.members = { some: { userId: req.user!.id } };
  }

  const [items, total] = await Promise.all([
    prisma.project.findMany({ where, include: PROJECT_INCLUDE, skip, take: limit, orderBy: { [sortField]: sortDir } }),
    prisma.project.count({ where }),
  ]);

  return ok(res, items, paginationMeta(page, limit, total));
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body;
  const project = await prisma.project.create({
    data: { ...body, createdById: req.user!.id },
  });

  // Creator automatically becomes OWNER member
  await prisma.projectMember.create({ data: { projectId: project.id, userId: req.user!.id, role: 'OWNER' } });

  req.auditContext = { entityType: 'projects', entityId: project.id, newValue: project };
  return created(res, project);
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { ...PROJECT_INCLUDE, workPackages: true, budgetCategories: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!project) throw ApiError.notFound('ไม่พบโครงการ');
  const summary = await computeProjectSummary(project.id);
  return ok(res, { ...project, summary });
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const before = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!before) throw ApiError.notFound('ไม่พบโครงการ');

  const updated = await prisma.project.update({ where: { id: req.params.id }, data: req.body });
  req.auditContext = { entityType: 'projects', entityId: updated.id, oldValue: before, newValue: updated };
  return ok(res, updated);
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const before = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!before) throw ApiError.notFound('ไม่พบโครงการ');

  await prisma.project.delete({ where: { id: req.params.id } });
  req.auditContext = { entityType: 'projects', entityId: before.id, action: 'DELETE', oldValue: before };
  return noContent(res);
});

export const getProjectSummary = asyncHandler(async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) throw ApiError.notFound('ไม่พบโครงการ');
  const summary = await computeProjectSummary(project.id);
  const byCategory = await computeCategorySummaries(project.id);
  return ok(res, { ...summary, byCategory });
});

// ---- Members -----------------------------------------------------------

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const { email, role } = req.body as { email: string; role: 'OWNER' | 'EDITOR' | 'VIEWER' };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw ApiError.notFound('ไม่พบโครงการ');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.notFound('ไม่พบผู้ใช้ที่มีอีเมลนี้ในระบบ กรุณาให้ผู้ใช้ลงทะเบียนก่อน');

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (existing) throw ApiError.conflict('ผู้ใช้นี้เป็นสมาชิกของโครงการอยู่แล้ว');

  const member = await prisma.projectMember.create({
    data: { projectId, userId: user.id, role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      projectId,
      type: 'PENDING_APPROVAL',
      message: `คุณได้รับสิทธิ์ ${role} ในโครงการ "${project.nameTh}"`,
    },
  }).catch(() => undefined);

  req.auditContext = { entityType: 'project_members', entityId: member.id, newValue: member };
  return created(res, member);
});

export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const userId = req.params.userId;
  const { role } = req.body as { role: 'OWNER' | 'EDITOR' | 'VIEWER' };

  const before = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
  if (!before) throw ApiError.notFound('ไม่พบสมาชิกในโครงการนี้');

  const updated = await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  req.auditContext = { entityType: 'project_members', entityId: updated.id, oldValue: before, newValue: updated };
  return ok(res, updated);
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const userId = req.params.userId;

  const before = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
  if (!before) throw ApiError.notFound('ไม่พบสมาชิกในโครงการนี้');

  await prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });
  req.auditContext = { entityType: 'project_members', entityId: before.id, action: 'DELETE', oldValue: before };
  return noContent(res);
});

// ---- Fundings ------------------------------------------------------------

export const addFunding = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const { fundingSourceId, fundingSourceName, fundingSourceCode, amount, notes } = req.body as {
    fundingSourceId?: string;
    fundingSourceName?: string;
    fundingSourceCode?: string;
    amount: number;
    notes?: string;
  };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw ApiError.notFound('ไม่พบโครงการ');

  let sourceId = fundingSourceId;
  if (!sourceId && fundingSourceName) {
    const source = await prisma.fundingSource.upsert({
      where: { code: fundingSourceCode ?? fundingSourceName },
      update: {},
      create: { name: fundingSourceName, code: fundingSourceCode ?? undefined },
    });
    sourceId = source.id;
  }
  if (!sourceId) throw ApiError.validation('ต้องระบุแหล่งทุน');

  const funding = await prisma.projectFunding.create({
    data: { projectId, fundingSourceId: sourceId, amount, notes },
    include: { fundingSource: true },
  });

  req.auditContext = { entityType: 'project_fundings', entityId: funding.id, newValue: funding };
  return created(res, funding);
});

// ---- Work Packages ---------------------------------------------------------

export const listWorkPackages = asyncHandler(async (req: Request, res: Response) => {
  const workPackages = await prisma.workPackage.findMany({ where: { projectId: req.params.id }, orderBy: { createdAt: 'asc' } });
  return ok(res, workPackages);
});

export const createWorkPackage = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw ApiError.notFound('ไม่พบโครงการ');

  const wp = await prisma.workPackage.create({ data: { ...req.body, projectId } });
  req.auditContext = { entityType: 'work_packages', entityId: wp.id, newValue: wp };
  return created(res, wp);
});

export const updateWorkPackage = asyncHandler(async (req: Request, res: Response) => {
  const before = await prisma.workPackage.findFirst({ where: { id: req.params.wpId, projectId: req.params.id } });
  if (!before) throw ApiError.notFound('ไม่พบ Work Package');

  const updated = await prisma.workPackage.update({ where: { id: before.id }, data: req.body });
  req.auditContext = { entityType: 'work_packages', entityId: updated.id, oldValue: before, newValue: updated };
  return ok(res, updated);
});

export const deleteWorkPackage = asyncHandler(async (req: Request, res: Response) => {
  const before = await prisma.workPackage.findFirst({ where: { id: req.params.wpId, projectId: req.params.id } });
  if (!before) throw ApiError.notFound('ไม่พบ Work Package');

  await prisma.workPackage.delete({ where: { id: before.id } });
  req.auditContext = { entityType: 'work_packages', entityId: before.id, action: 'DELETE', oldValue: before };
  return noContent(res);
});
