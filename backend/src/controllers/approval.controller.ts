import { Request, Response } from 'express';
import { ProjectRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError';
import { ok } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { assertProjectAccess, PROJECT_ROLE_RANK } from '../utils/access';
// assertProjectAccess used in listApprovals; assertProjectAccessOrThrowRole (below) covers
// the step-specific minimum-role checks needed for approve/reject.
import { currentStepForStatus, MIN_ROLE_FOR_STEP, NEXT_STATUS_ON_APPROVE } from '../services/approval.service';

export const listApprovals = asyncHandler(async (req: Request, res: Response) => {
  const expense = await prisma.expense.findUnique({ where: { id: req.params.expenseId } });
  if (!expense) throw ApiError.notFound('ไม่พบรายการเบิกจ่าย');
  await assertProjectAccess(req.user!, expense.projectId, 'VIEWER');

  const approvals = await prisma.approval.findMany({
    where: { expenseId: expense.id },
    include: { approver: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return ok(res, approvals);
});

export const approveExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await prisma.expense.findUnique({ where: { id: req.params.expenseId } });
  if (!expense) throw ApiError.notFound('ไม่พบรายการเบิกจ่าย');

  const step = currentStepForStatus(expense.status);
  if (!step) throw ApiError.conflict(`รายการนี้อยู่ในสถานะ ${expense.status} ไม่สามารถอนุมัติได้`);

  const minRole = MIN_ROLE_FOR_STEP[step];
  await assertProjectAccessOrThrowRole(req.user!, expense.projectId, minRole);

  const nextStatus = NEXT_STATUS_ON_APPROVE[expense.status]!;
  const { comment } = req.body as { comment?: string };

  const [approval, updatedExpense] = await prisma.$transaction([
    prisma.approval.create({
      data: {
        expenseId: expense.id,
        approverId: req.user!.id,
        step,
        status: 'APPROVED',
        comment,
        actedAt: new Date(),
      },
    }),
    prisma.expense.update({ where: { id: expense.id }, data: { status: nextStatus } }),
  ]);

  if (nextStatus === 'PAID') {
    await prisma.notification.create({
      data: {
        userId: expense.submittedById,
        projectId: expense.projectId,
        type: 'EXPENSE_PAID',
        message: `รายการเบิกจ่าย "${expense.description}" ได้รับการเบิกจ่ายแล้ว`,
      },
    }).catch(() => undefined);
  }

  req.auditContext = {
    entityType: 'approvals',
    entityId: approval.id,
    action: 'APPROVE',
    newValue: { approval, expenseStatus: updatedExpense.status },
  };
  return ok(res, { approval, expense: updatedExpense });
});

export const rejectExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await prisma.expense.findUnique({ where: { id: req.params.expenseId } });
  if (!expense) throw ApiError.notFound('ไม่พบรายการเบิกจ่าย');

  const step = currentStepForStatus(expense.status);
  if (!step) throw ApiError.conflict(`รายการนี้อยู่ในสถานะ ${expense.status} ไม่สามารถตีกลับได้`);

  const minRole = MIN_ROLE_FOR_STEP[step];
  await assertProjectAccessOrThrowRole(req.user!, expense.projectId, minRole);

  const { comment } = req.body as { comment?: string };
  if (!comment) throw ApiError.validation('กรุณาระบุเหตุผลในการตีกลับ (comment)');

  const [approval, updatedExpense] = await prisma.$transaction([
    prisma.approval.create({
      data: {
        expenseId: expense.id,
        approverId: req.user!.id,
        step,
        status: 'REJECTED',
        comment,
        actedAt: new Date(),
      },
    }),
    prisma.expense.update({ where: { id: expense.id }, data: { status: 'REJECTED' } }),
  ]);

  await prisma.notification.create({
    data: {
      userId: expense.submittedById,
      projectId: expense.projectId,
      type: 'EXPENSE_REJECTED',
      message: `รายการเบิกจ่าย "${expense.description}" ถูกตีกลับ: ${comment}`,
    },
  }).catch(() => undefined);

  req.auditContext = {
    entityType: 'approvals',
    entityId: approval.id,
    action: 'REJECT',
    newValue: { approval, expenseStatus: updatedExpense.status },
  };
  return ok(res, { approval, expense: updatedExpense });
});

export const listPendingApprovals = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
    const pending = await prisma.expense.findMany({
      where: { status: { in: ['PENDING_STAFF', 'PENDING_LEAD'] } },
      include: { project: { select: { id: true, code: true, nameTh: true } }, category: true },
      orderBy: { updatedAt: 'asc' },
    });
    return ok(res, pending);
  }

  const memberships = await prisma.projectMember.findMany({ where: { userId: user.id } });
  const editorPlusProjectIds = memberships.filter((m) => m.role === 'EDITOR' || m.role === 'OWNER').map((m) => m.projectId);
  const ownerProjectIds = memberships.filter((m) => m.role === 'OWNER').map((m) => m.projectId);

  const pending = await prisma.expense.findMany({
    where: {
      OR: [
        { status: 'PENDING_STAFF', projectId: { in: editorPlusProjectIds } },
        { status: 'PENDING_LEAD', projectId: { in: ownerProjectIds } },
      ],
    },
    include: { project: { select: { id: true, code: true, nameTh: true } }, category: true },
    orderBy: { updatedAt: 'asc' },
  });
  return ok(res, pending);
});

async function assertProjectAccessOrThrowRole(user: { id: string; role: 'SUPER_ADMIN' | 'ADMIN' | 'USER' }, projectId: string, minRole: ProjectRole) {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return;
  const membership = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
  if (!membership || PROJECT_ROLE_RANK[membership.role] < PROJECT_ROLE_RANK[minRole]) {
    throw ApiError.forbidden('สิทธิ์ในการอนุมัติขั้นตอนนี้ไม่เพียงพอ');
  }
}
