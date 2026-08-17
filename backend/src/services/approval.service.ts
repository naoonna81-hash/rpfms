import { ApprovalStep, ExpenseStatus, ProjectRole } from '@prisma/client';

/**
 * Workflow: DRAFT -> PENDING_STAFF -> PENDING_LEAD -> APPROVED -> PAID
 * REJECTED can happen from PENDING_STAFF, PENDING_LEAD or APPROVED (any point before PAID).
 *
 * Each transition is recorded as an Approval row. Steps map to ExpenseStatus as follows:
 *  - STAFF_REVIEW: acting on a PENDING_STAFF expense (finance staff review) -> approve moves to PENDING_LEAD
 *  - PROJECT_LEAD_APPROVAL: acting on a PENDING_LEAD expense (project lead sign-off) -> approve moves to APPROVED
 *  - CLOSED: acting on an APPROVED expense (mark as disbursed/paid, closing the workflow) -> approve moves to PAID
 */
export const STEP_FOR_STATUS: Partial<Record<ExpenseStatus, ApprovalStep>> = {
  PENDING_STAFF: 'STAFF_REVIEW',
  PENDING_LEAD: 'PROJECT_LEAD_APPROVAL',
  APPROVED: 'CLOSED',
};

export const NEXT_STATUS_ON_APPROVE: Partial<Record<ExpenseStatus, ExpenseStatus>> = {
  PENDING_STAFF: 'PENDING_LEAD',
  PENDING_LEAD: 'APPROVED',
  APPROVED: 'PAID',
};

/** Minimum ProjectRole required to act (approve or reject) at each step. */
export const MIN_ROLE_FOR_STEP: Record<ApprovalStep, ProjectRole> = {
  STAFF_REVIEW: 'EDITOR',
  PROJECT_LEAD_APPROVAL: 'OWNER',
  CLOSED: 'EDITOR',
};

export function currentStepForStatus(status: ExpenseStatus): ApprovalStep | null {
  return STEP_FOR_STATUS[status] ?? null;
}

export function isActionable(status: ExpenseStatus): boolean {
  return status in STEP_FOR_STATUS;
}
