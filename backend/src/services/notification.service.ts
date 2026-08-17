import { prisma } from '../lib/prisma';
import { NotificationType, ProjectRole } from '@prisma/client';
import { computeCategorySummaries, computeProjectSummary } from './budget.service';

const BUDGET_LOW_THRESHOLD = 80; // %
const PENDING_APPROVAL_STALE_DAYS = 3;
const PROJECT_ENDING_DAYS = 30;
const DEDUPE_WINDOW_DAYS = 3; // don't re-notify the same user/project/type/message within this window

async function alreadyNotifiedRecently(userId: string, projectId: string | null, type: NotificationType, message: string) {
  const since = new Date(Date.now() - DEDUPE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: { userId, projectId: projectId ?? undefined, type, message, createdAt: { gte: since } },
  });
  return !!existing;
}

async function notifyProjectRoleHolders(projectId: string, minRoles: ProjectRole[], type: NotificationType, message: string) {
  const members = await prisma.projectMember.findMany({ where: { projectId, role: { in: minRoles } } });
  let created = 0;
  for (const member of members) {
    if (await alreadyNotifiedRecently(member.userId, projectId, type, message)) continue;
    await prisma.notification.create({ data: { userId: member.userId, projectId, type, message } });
    created += 1;
  }
  return created;
}

export interface GenerateNotificationsResult {
  budgetLow: number;
  budgetOver: number;
  pendingApproval: number;
  projectEnding: number;
}

/** Idempotently scans all active projects and creates Notification rows for the four rule types. */
export async function generateNotifications(): Promise<GenerateNotificationsResult> {
  const result: GenerateNotificationsResult = { budgetLow: 0, budgetOver: 0, pendingApproval: 0, projectEnding: 0 };

  const projects = await prisma.project.findMany({ where: { status: 'ACTIVE' } });

  for (const project of projects) {
    // --- BUDGET_LOW / BUDGET_OVER: project-level and per-category -------------------------
    const summary = await computeProjectSummary(project.id);
    if (summary.utilizationPct >= 100) {
      const msg = `โครงการ "${project.nameTh}" ใช้งบประมาณเกินวงเงินที่ได้รับ (${summary.utilizationPct.toFixed(1)}%)`;
      result.budgetOver += await notifyProjectRoleHolders(project.id, ['OWNER', 'EDITOR'], 'BUDGET_OVER', msg);
    } else if (summary.utilizationPct >= BUDGET_LOW_THRESHOLD) {
      const msg = `โครงการ "${project.nameTh}" ใช้งบประมาณไปแล้ว ${summary.utilizationPct.toFixed(1)}% ของวงเงินรวม`;
      result.budgetLow += await notifyProjectRoleHolders(project.id, ['OWNER', 'EDITOR'], 'BUDGET_LOW', msg);
    }

    const categories = await computeCategorySummaries(project.id);
    for (const cat of categories) {
      if (cat.allocatedAmount <= 0) continue;
      if (cat.utilizationPct >= 100) {
        const msg = `หมวด "${cat.name}" ในโครงการ "${project.nameTh}" ใช้งบประมาณเกินวงเงิน (${cat.utilizationPct.toFixed(1)}%)`;
        result.budgetOver += await notifyProjectRoleHolders(project.id, ['OWNER', 'EDITOR'], 'BUDGET_OVER', msg);
      } else if (cat.utilizationPct >= BUDGET_LOW_THRESHOLD) {
        const msg = `หมวด "${cat.name}" ในโครงการ "${project.nameTh}" ใช้งบประมาณไปแล้ว ${cat.utilizationPct.toFixed(1)}%`;
        result.budgetLow += await notifyProjectRoleHolders(project.id, ['OWNER', 'EDITOR'], 'BUDGET_LOW', msg);
      }
    }

    // --- PROJECT_ENDING: <=30 days to endDate --------------------------------------------
    const daysToEnd = Math.ceil((project.endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysToEnd >= 0 && daysToEnd <= PROJECT_ENDING_DAYS) {
      const msg = `โครงการ "${project.nameTh}" จะสิ้นสุดในอีก ${daysToEnd} วัน (${project.endDate.toISOString().slice(0, 10)})`;
      result.projectEnding += await notifyProjectRoleHolders(project.id, ['OWNER', 'EDITOR'], 'PROJECT_ENDING', msg);
    }
  }

  // --- PENDING_APPROVAL: expenses pending > 3 days ---------------------------------------
  const staleSince = new Date(Date.now() - PENDING_APPROVAL_STALE_DAYS * 24 * 60 * 60 * 1000);
  const staleExpenses = await prisma.expense.findMany({
    where: { status: { in: ['PENDING_STAFF', 'PENDING_LEAD'] }, updatedAt: { lte: staleSince } },
    include: { project: true },
  });
  for (const expense of staleExpenses) {
    const roles: ProjectRole[] = expense.status === 'PENDING_STAFF' ? ['EDITOR', 'OWNER'] : ['OWNER'];
    const msg = `รายการเบิกจ่าย "${expense.description}" ในโครงการ "${expense.project.nameTh}" ค้างการอนุมัติเกิน ${PENDING_APPROVAL_STALE_DAYS} วัน`;
    result.pendingApproval += await notifyProjectRoleHolders(expense.projectId, roles, 'PENDING_APPROVAL', msg);
  }

  return result;
}
