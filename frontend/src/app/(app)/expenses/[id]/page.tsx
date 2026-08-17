"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileText, Loader2, Paperclip, Send, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { ExpenseStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { expensesApi } from "@/lib/api/endpoints";
import { API_BASE_URL } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/client";
import { formatCurrency, formatThaiDate } from "@/lib/utils";
import { ApprovalStepper } from "@/components/approvals/approval-stepper";

const paymentMethodLabel: Record<string, string> = {
  CASH: "เงินสด",
  TRANSFER: "โอนเงิน",
  CHEQUE: "เช็ค",
  CREDIT_CARD: "บัตรเครดิต",
  OTHER: "อื่นๆ",
};

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const expenseId = params.id;

  const query = useQuery({
    queryKey: ["expense", expenseId],
    queryFn: () => expensesApi.get(expenseId),
  });

  const submitMutation = useMutation({
    mutationFn: () => expensesApi.submit(expenseId),
    onSuccess: () => {
      toast.success("ส่งขออนุมัติสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => expensesApi.remove(expenseId),
    onSuccess: () => {
      toast.success("ลบรายการสำเร็จ");
      router.push("/expenses");
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด"),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;

  const expense = query.data;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => router.push("/expenses")}>
        <ArrowLeft className="h-4 w-4" /> กลับไปรายการเบิกจ่าย
      </Button>

      <PageHeader
        title={expense.description}
        description={`เลขที่เอกสาร ${expense.documentNo} · วันที่ ${formatThaiDate(expense.date)}`}
        actions={
          <>
            <ExpenseStatusBadge status={expense.status} />
            {expense.status === "DRAFT" && (
              <>
                <Button variant="outline" size="sm" onClick={() => router.push(`/expenses/${expenseId}/edit`)}>
                  แก้ไข
                </Button>
                <Button size="sm" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  ส่งขออนุมัติ
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
            {expense.status === "REJECTED" && (
              <Button variant="outline" size="sm" onClick={() => router.push(`/expenses/${expenseId}/edit`)}>
                แก้ไขและส่งใหม่
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>รายละเอียดรายการ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <Field label="โครงการ" value={expense.project?.nameTh ?? "-"} />
            <Field label="หมวดงบประมาณ" value={expense.category?.name ?? "-"} />
            <Field label="จำนวนเงิน" value={formatCurrency(expense.amount, { withSymbol: true })} bold />
            <Field label="ผู้รับเงิน" value={expense.payee} />
            <Field label="วิธีการชำระเงิน" value={paymentMethodLabel[expense.paymentMethod] ?? expense.paymentMethod} />
            <Field label="ผู้บันทึกรายการ" value={expense.submittedById} />

            <Separator className="col-span-full my-1" />
            <div className="col-span-full">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" /> ไฟล์แนบ ({expense.files?.length ?? 0})
              </p>
              {!expense.files || expense.files.length === 0 ? (
                <p className="text-sm text-muted-foreground">ไม่มีไฟล์แนบ</p>
              ) : (
                <div className="space-y-2">
                  {expense.files.map((f) => (
                    <a
                      key={f.id}
                      href={`${API_BASE_URL}${f.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{f.fileUrl.split("/").pop()}</span>
                      {f.ocrExtractedData && <Badge variant="info" className="ml-auto">ผ่าน OCR</Badge>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>สถานะการอนุมัติ</CardTitle>
            <CardDescription>เจ้าหน้าที่ → หัวหน้าโครงการ → ปิดรายการ</CardDescription>
          </CardHeader>
          <CardContent>
            <ApprovalStepper status={expense.status} approvals={expense.approvals ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={bold ? "font-semibold tabular-nums" : ""}>{value}</p>
    </div>
  );
}
