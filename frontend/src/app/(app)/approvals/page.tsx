"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ExpenseStatusBadge } from "@/components/shared/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ApprovalStepper } from "@/components/approvals/approval-stepper";
import { approvalsApi } from "@/lib/api/endpoints";
import { ApiClientError } from "@/lib/api/client";
import { formatCurrency, formatThaiDate } from "@/lib/utils";
import type { Expense } from "@/types";

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Expense | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [comment, setComment] = useState("");

  const query = useQuery({
    queryKey: ["approvals-pending"],
    queryFn: () => approvalsApi.pending({ limit: 50 }),
  });

  const actMutation = useMutation({
    mutationFn: () => {
      if (!selected || !action) throw new Error("missing");
      return action === "approve" ? approvalsApi.approve(selected.id, comment) : approvalsApi.reject(selected.id, comment);
    },
    onSuccess: () => {
      toast.success(action === "approve" ? "อนุมัติรายการสำเร็จ" : "ตีกลับรายการสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["approvals-pending"] });
      setSelected(null);
      setAction(null);
      setComment("");
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด"),
  });

  return (
    <div className="space-y-5">
      <PageHeader title="ระบบอนุมัติ" description="รายการเบิกจ่ายที่รอการอนุมัติจากคุณ" />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : !query.data || query.data.items.length === 0 ? (
        <EmptyState title="ไม่มีรายการรออนุมัติ" description="รายการที่รอการอนุมัติของคุณจะปรากฏที่นี่" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {query.data.items.map((exp) => (
            <Card key={exp.id}>
              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{exp.description}</CardTitle>
                  <ExpenseStatusBadge status={exp.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {exp.project?.nameTh ?? "-"} · {exp.documentNo}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">วันที่</p>
                    <p>{formatThaiDate(exp.date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">จำนวนเงิน</p>
                    <p className="font-semibold tabular-nums">{formatCurrency(exp.amount, { withSymbol: true })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ผู้รับเงิน</p>
                    <p>{exp.payee}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">หมวดงบประมาณ</p>
                    <p>{exp.category?.name ?? "-"}</p>
                  </div>
                </div>
                <ApprovalStepper status={exp.status} approvals={exp.approvals ?? []} />
                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1"
                    variant="success"
                    onClick={() => { setSelected(exp); setAction("approve"); setComment(""); }}
                  >
                    <Check className="h-4 w-4" /> อนุมัติ
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onClick={() => { setSelected(exp); setAction("reject"); setComment(""); }}
                  >
                    <X className="h-4 w-4" /> ไม่อนุมัติ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === "approve" ? "ยืนยันการอนุมัติ" : "ยืนยันการตีกลับรายการ"}</DialogTitle>
            <DialogDescription>{selected?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              ความคิดเห็น {action === "reject" && <span className="text-destructive">*</span>}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={action === "approve" ? "ความคิดเห็นเพิ่มเติม (ถ้ามี)" : "กรุณาระบุเหตุผลที่ไม่อนุมัติ"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>ยกเลิก</Button>
            <Button
              variant={action === "approve" ? "success" : "destructive"}
              disabled={actMutation.isPending || (action === "reject" && !comment.trim())}
              onClick={() => actMutation.mutate()}
            >
              {actMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {action === "approve" ? "ยืนยันอนุมัติ" : "ยืนยันไม่อนุมัติ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
