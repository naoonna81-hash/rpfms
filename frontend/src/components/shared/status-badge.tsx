import { Badge } from "@/components/ui/badge";
import type { ExpenseStatus, ProjectStatus } from "@/types";

const expenseStatusMap: Record<ExpenseStatus, { label: string; variant: "gray" | "warning" | "info" | "success" | "destructive" }> = {
  DRAFT: { label: "แบบร่าง", variant: "gray" },
  PENDING_STAFF: { label: "รออนุมัติ (เจ้าหน้าที่)", variant: "warning" },
  PENDING_LEAD: { label: "รออนุมัติ (หัวหน้าโครงการ)", variant: "warning" },
  APPROVED: { label: "อนุมัติ", variant: "success" },
  PAID: { label: "จ่ายแล้ว", variant: "info" },
  REJECTED: { label: "ไม่อนุมัติ", variant: "destructive" },
};

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  const cfg = expenseStatusMap[status] ?? { label: status, variant: "gray" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

const projectStatusMap: Record<ProjectStatus, { label: string; variant: "success" | "gray" | "warning" | "destructive" }> = {
  ACTIVE: { label: "ดำเนินการอยู่", variant: "success" },
  COMPLETED: { label: "เสร็จสิ้น", variant: "gray" },
  SUSPENDED: { label: "ระงับชั่วคราว", variant: "warning" },
  CLOSED: { label: "ปิดโครงการ", variant: "destructive" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = projectStatusMap[status] ?? { label: status, variant: "gray" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
