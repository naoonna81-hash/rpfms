import { Check, Clock, X } from "lucide-react";
import { cn, formatThaiDate } from "@/lib/utils";
import type { Approval, ExpenseStatus } from "@/types";

const steps: { key: string; label: string }[] = [
  { key: "STAFF", label: "เจ้าหน้าที่" },
  { key: "LEAD", label: "หัวหน้าโครงการ" },
  { key: "CLOSE", label: "ปิดรายการ" },
];

function stepState(stepKey: string, status: ExpenseStatus, approvals: Approval[]): "done" | "current" | "rejected" | "pending" {
  const approval = approvals.find((a) => a.step === stepKey);
  if (approval?.status === "REJECTED") return "rejected";
  if (approval?.status === "APPROVED") return "done";

  if (status === "REJECTED") return "pending";
  if (stepKey === "STAFF") return status === "PENDING_STAFF" ? "current" : status === "DRAFT" ? "pending" : "done";
  if (stepKey === "LEAD") {
    if (status === "PENDING_LEAD") return "current";
    if (["APPROVED", "PAID"].includes(status)) return "done";
    return "pending";
  }
  if (stepKey === "CLOSE") {
    if (status === "APPROVED") return "current";
    if (status === "PAID") return "done";
    return "pending";
  }
  return "pending";
}

export function ApprovalStepper({ status, approvals }: { status: ExpenseStatus; approvals: Approval[] }) {
  return (
    <div className="space-y-4">
      <ol className="space-y-0">
        {steps.map((step, i) => {
          const state = stepState(step.key, status, approvals);
          const approval = approvals.find((a) => a.step === step.key);
          return (
            <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
              {i < steps.length - 1 && (
                <span
                  className={cn(
                    "absolute left-[13px] top-6 h-full w-px",
                    state === "done" ? "bg-success" : "bg-border",
                  )}
                />
              )}
              <span
                className={cn(
                  "z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  state === "done" && "border-success bg-success text-success-foreground",
                  state === "current" && "border-primary bg-primary/10 text-primary",
                  state === "rejected" && "border-destructive bg-destructive/10 text-destructive",
                  state === "pending" && "border-border bg-muted text-muted-foreground",
                )}
              >
                {state === "done" && <Check className="h-3.5 w-3.5" />}
                {state === "current" && <Clock className="h-3.5 w-3.5" />}
                {state === "rejected" && <X className="h-3.5 w-3.5" />}
                {state === "pending" && i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-sm font-medium",
                    state === "pending" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {step.label}
                </p>
                {approval && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    <p>{formatThaiDate(approval.createdAt)}</p>
                    {approval.comment && <p className="mt-0.5 italic">&ldquo;{approval.comment}&rdquo;</p>}
                  </div>
                )}
                {state === "current" && !approval && <p className="mt-0.5 text-xs text-primary">กำลังรออนุมัติ</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
