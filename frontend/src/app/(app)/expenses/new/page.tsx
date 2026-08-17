"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectSelect } from "@/components/shared/project-select";
import { CategorySelect } from "@/components/shared/category-select";
import { OcrPanel } from "@/components/expenses/ocr-panel";
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

export default function NewExpensePage() {
  const router = useRouter();
  const expenseIdRef = useRef<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().slice(0, 10), paymentMethod: "TRANSFER" },
  });

  const projectId = watch("projectId");

  // สร้างรายการแบบร่างถ้ายังไม่มี เพื่อใช้แนบไฟล์ OCR ได้
  const ensureExpenseId = async (): Promise<string | null> => {
    if (expenseIdRef.current) return expenseIdRef.current;
    const values = getValues();
    if (!values.projectId || !values.categoryId) return null;
    try {
      const created = await expensesApi.create({
        projectId: values.projectId,
        categoryId: values.categoryId,
        date: values.date || new Date().toISOString().slice(0, 10),
        documentNo: values.documentNo || "-",
        description: values.description || "รายการเบิกจ่าย (รอตรวจสอบ)",
        amount: values.amount || 0,
        payee: values.payee || "-",
        paymentMethod: values.paymentMethod || "TRANSFER",
      });
      expenseIdRef.current = created.id;
      return created.id;
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "ไม่สามารถสร้างรายการแบบร่างได้");
      return null;
    }
  };

  const onAcceptOcr = (field: "date" | "amount" | "documentNo", value: string | number) => {
    if (field === "date") setValue("date", String(value).slice(0, 10), { shouldValidate: true });
    else if (field === "amount") setValue("amount", Number(value), { shouldValidate: true });
    else setValue("documentNo", String(value), { shouldValidate: true });
  };

  const persist = async (values: FormValues) => {
    if (expenseIdRef.current) {
      return expensesApi.update(expenseIdRef.current, values);
    }
    const created = await expensesApi.create(values);
    expenseIdRef.current = created.id;
    return created;
  };

  const onSaveDraft = handleSubmit(async (values) => {
    setSaving("draft");
    try {
      const expense = await persist(values);
      toast.success("บันทึกแบบร่างสำเร็จ");
      router.push(`/expenses/${expense.id}`);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(null);
    }
  });

  const onSubmitForApproval = handleSubmit(async (values) => {
    setSaving("submit");
    try {
      const expense = await persist(values);
      await expensesApi.submit(expense.id);
      toast.success("ส่งขออนุมัติสำเร็จ");
      router.push(`/expenses/${expense.id}`);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(null);
    }
  });

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => router.push("/expenses")}>
        <ArrowLeft className="h-4 w-4" /> กลับไปรายการเบิกจ่าย
      </Button>
      <PageHeader title="สร้างรายการเบิกจ่ายใหม่" description="กรอกข้อมูลรายการเบิกจ่าย หรือใช้ผู้ช่วย OCR เพื่อดึงข้อมูลจากใบเสร็จ" />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>รายละเอียดการเบิกจ่าย</CardTitle>
            <CardDescription>ฟิลด์ที่มี * จำเป็นต้องกรอก</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>โครงการ *</Label>
                <ProjectSelect
                  value={projectId}
                  onChange={(v) => {
                    setValue("projectId", v, { shouldValidate: true });
                    setValue("categoryId", "");
                  }}
                />
                {errors.projectId && <p className="text-xs text-destructive">{errors.projectId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>หมวดงบประมาณ *</Label>
                <CategorySelect
                  projectId={projectId}
                  value={watch("categoryId")}
                  onChange={(v) => setValue("categoryId", v, { shouldValidate: true })}
                />
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
                <Input {...register("documentNo")} placeholder="เช่น INV-2569-001" />
                {errors.documentNo && <p className="text-xs text-destructive">{errors.documentNo.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>รายละเอียด *</Label>
              <Textarea {...register("description")} placeholder="รายละเอียดรายการเบิกจ่าย" />
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
              <Select
                value={watch("paymentMethod")}
                onValueChange={(v) => setValue("paymentMethod", v as PaymentMethod)}
              >
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
                disabled={!!saving}
                onClick={async () => {
                  const valid = await trigger();
                  if (valid) onSaveDraft();
                }}
              >
                {saving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                บันทึกแบบร่าง
              </Button>
              <Button
                type="button"
                disabled={!!saving}
                onClick={async () => {
                  const valid = await trigger();
                  if (valid) onSubmitForApproval();
                }}
              >
                {saving === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                ส่งขออนุมัติ
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <OcrPanel ensureExpenseId={ensureExpenseId} onAccept={onAcceptOcr} />
        </div>
      </div>
    </div>
  );
}
