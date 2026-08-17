"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { budgetCategoriesApi } from "@/lib/api/endpoints";
import { ApiClientError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/utils";
import type { BudgetCategory } from "@/types";

const schema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อหมวดงบประมาณ"),
  allocatedAmount: z.coerce.number().min(0, "จำนวนเงินต้องไม่ติดลบ"),
});
type FormValues = z.infer<typeof schema>;

export function BudgetCategoriesPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetCategory | null>(null);

  const query = useQuery({
    queryKey: ["budget-categories", projectId],
    queryFn: () => budgetCategoriesApi.list(projectId),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (formOpen) reset(editing ? { name: editing.name, allocatedAmount: editing.allocatedAmount } : { name: "", allocatedAmount: 0 });
  }, [formOpen, editing, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      editing ? budgetCategoriesApi.update(projectId, editing.id, values) : budgetCategoriesApi.create(projectId, values),
    onSuccess: () => {
      toast.success("บันทึกหมวดงบประมาณสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["budget-categories", projectId] });
      setFormOpen(false);
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetCategoriesApi.remove(projectId, id),
    onSuccess: () => {
      toast.success("ลบหมวดงบประมาณสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["budget-categories", projectId] });
      setDeleteTarget(null);
    },
    onError: (e) => {
      toast.error(e instanceof ApiClientError ? e.message : "ไม่สามารถลบได้ อาจมีรายการเบิกจ่ายผูกอยู่");
      setDeleteTarget(null);
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>หมวดงบประมาณ</CardTitle>
          <CardDescription>จัดการหมวดงบประมาณของโครงการ (เพิ่มหมวดเองได้ เช่น ค่าเดินทาง ค่าอบรม)</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> เพิ่มหมวด
        </Button>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState title="ยังไม่มีหมวดงบประมาณ" description="เพิ่มหมวดงบประมาณเพื่อเริ่มบันทึกการเบิกจ่าย" />
        ) : (
          <div className="space-y-3">
            {query.data.items.map((cat) => {
              const spent = cat.spentAmount ?? 0;
              const pct = cat.allocatedAmount > 0 ? Math.min(100, (spent / cat.allocatedAmount) * 100) : 0;
              return (
                <div key={cat.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{cat.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        ใช้ไป {formatCurrency(spent)} / {formatCurrency(cat.allocatedAmount)} บาท
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(cat); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(cat)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Progress
                    value={pct}
                    className="mt-2 h-1.5"
                    indicatorClassName={pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary"}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขหมวดงบประมาณ" : "เพิ่มหมวดงบประมาณ"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>ชื่อหมวดงบประมาณ</Label>
              <Input {...register("name")} placeholder="เช่น ค่าตอบแทน, ค่าเดินทาง" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>จำนวนเงินที่จัดสรร (บาท)</Label>
              <Input type="number" step="0.01" {...register("allocatedAmount")} />
              {errors.allocatedAmount && <p className="text-xs text-destructive">{errors.allocatedAmount.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
                {(isSubmitting || saveMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบหมวดงบประมาณ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            คุณต้องการลบหมวด &ldquo;{deleteTarget?.name}&rdquo; ใช่หรือไม่ (ลบได้เฉพาะหมวดที่ไม่มีรายการเบิกจ่ายผูกอยู่)
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
