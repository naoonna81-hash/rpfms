"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectSelect } from "@/components/shared/project-select";
import { CategorySelect } from "@/components/shared/category-select";
import { OcrPanel } from "@/components/expenses/ocr-panel";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { expensesApi } from "@/lib/api/endpoints";
import { ApiClientError } from "@/lib/api/client";
import type { PaymentMethod } from "@/types";

const schema = z.object({
  projectId: z.string().min(1, "กรุณาเลือกโครงการ"),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดงบประมาณ"),
  date: z.string().min(1, "กรุณาเลือกวันที่"),
  documentNo: z.string().min(1, "กรุณากรอกเลขที่เอกสาร"),
  description: z.string().min(1, "กรุณากรอกรายละเอียด"),
  amount: z.coerce.number().positive("จำนวนเงินต้องมากกว่า 0"),
  payee: z.string().min(1, "กรุณากรอกชื่อผู้รับเงิน"),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CHEQUE", "CREDIT_CARD", "OTHER"]),
});
type FormValues = z.infer<typeof schema>;

export default function EditExpensePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const expenseId = params.id;

  const query = useQuery({ queryKey: ["expense", expenseId], queryFn: () => expensesApi.get(expenseId) });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (query.data) {
      reset({
        projectId: query.data.projectId,
        categoryId: query.data.categoryId,
        date: query.data.date?.slice(0, 10),
        documentNo: query.data.documentNo,
        description: query.data.description,
        amount: query.data.amount,
        payee: query.data.payee,
        paymentMethod: query.data.paymentMethod,
      });
    }
  }, [query.data, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => expensesApi.update(expenseId, values),
    onSuccess: () => {
      toast.success("บันทึกการแก้ไขสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
      router.push(`/expenses/${expenseId}`);
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด"),
  });

  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await expensesApi.update(expenseId, values);
      return expensesApi.submit(expenseId);
    },
    onSuccess: () => {
      toast.success("ส่งขออนุมัติสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
      router.push(`/expenses/${expenseId}`);
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด"),
  });

  const onAcceptOcr = (field: "date" | "amount" | "documentNo", value: string | number) => {
    if (field === "date") setValue("date", String(value).slice(0, 10), { shouldValidate: true });
    else if (field === "amount") setValue("amount", Number(value), { shouldValidate: true });
    else setValue("documentNo", String(value), { shouldValidate: true });
  };

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;

  const projectId = watch("projectId");

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => router.push(`/expenses/${expenseId}`)}>
        <ArrowLeft className="h-4 w-4" /> กลับ
      </Button>
      <PageHeader title="แก้ไขรายการเบิกจ่าย" description={`เลขที่เอกสาร ${query.data.documentNo}`} />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>รายละเอียดการเบิกจ่าย</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>โครงการ *</Label>
                <ProjectSelect value={projectId} onChange={(v) => { setValue("projectId", v, { shouldValidate: true }); setValue("categoryId", ""); }} />
                {errors.projectId && <p className="text-xs text-destructive">{errors.projectId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>หมวดงบประมาณ *</Label>
                <CategorySelect projectId={projectId} value={watch("categoryId")} onChange={(v) => setValue("categoryId", v, { shouldValidate: true })} />
                {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>วันที่ *</Label>
                <Input type="date" {...register("date")} />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>เลขที่เอกสาร *</Label>
                <Input {...register("documentNo")} />
                {errors.documentNo && <p className="text-xs text-destructive">{errors.documentNo.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>รายละเอียด *</Label>
              <Textarea {...register("description")} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>จำนวนเงิน (บาท) *</Label>
                <Input type="number" step="0.01" {...register("amount")} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>ผู้รับเงิน *</Label>
                <Input {...register("payee")} />
                {errors.payee && <p className="text-xs text-destructive">{errors.payee.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>วิธีการชำระเงิน *</Label>
              <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v as PaymentMethod)}>
                <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFER">โอนเงิน</SelectItem>
                  <SelectItem value="CASH">เงินสด</SelectItem>
                  <SelectItem value="CHEQUE">เช็ค</SelectItem>
                  <SelectItem value="CREDIT_CARD">บัตรเครดิต</SelectItem>
                  <SelectItem value="OTHER">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={updateMutation.isPending || submitMutation.isPending}
                onClick={handleSubmit((v) => updateMutation.mutate(v))}
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                บันทึกการแก้ไข
              </Button>
              <Button
                type="button"
                disabled={updateMutation.isPending || submitMutation.isPending}
                onClick={handleSubmit((v) => submitMutation.mutate(v))}
              >
                {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                บันทึกและส่งขออนุมัติ
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <OcrPanel ensureExpenseId={async () => expenseId} onAccept={onAcceptOcr} />
        </div>
      </div>
    </div>
  );
}
