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
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { incomeApi } from "@/lib/api/endpoints";
import { ApiClientError } from "@/lib/api/client";
import { formatCurrency, formatThaiDate } from "@/lib/utils";
import type { Income } from "@/types";

const schema = z.object({
  installment: z.string().min(1, "กรุณากรอกงวด"),
  receivedDate: z.string().min(1, "กรุณาเลือกวันที่รับเงิน"),
  amount: z.coerce.number().min(0, "จำนวนเงินต้องไม่ติดลบ"),
  documentNo: z.string().min(1, "กรุณากรอกเลขที่เอกสาร"),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function IncomePanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null);

  const query = useQuery({
    queryKey: ["incomes", projectId],
    queryFn: () => incomeApi.list(projectId, { limit: 100 }),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (formOpen) {
      reset(
        editing
          ? { installment: editing.installment, receivedDate: editing.receivedDate?.slice(0, 10), amount: editing.amount, documentNo: editing.documentNo, notes: editing.notes ?? "" }
          : { installment: "", receivedDate: "", amount: 0, documentNo: "", notes: "" },
      );
    }
  }, [formOpen, editing, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => (editing ? incomeApi.update(projectId, editing.id, values) : incomeApi.create(projectId, values)),
    onSuccess: () => {
      toast.success("บันทึกรายรับสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["incomes", projectId] });
      setFormOpen(false);
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => incomeApi.remove(projectId, id),
    onSuccess: () => {
      toast.success("ลบรายรับสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["incomes", projectId] });
      setDeleteTarget(null);
    },
    onError: (e) => {
      toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด");
      setDeleteTarget(null);
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>ระบบรายรับ</CardTitle>
          <CardDescription>บันทึกเงินงวดที่ได้รับจากแหล่งทุน</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> บันทึกรายรับ
        </Button>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState title="ยังไม่มีรายการรายรับ" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>งวด</TableHead>
                <TableHead>วันที่รับเงิน</TableHead>
                <TableHead>เลขที่เอกสาร</TableHead>
                <TableHead>จำนวนเงิน</TableHead>
                <TableHead>หมายเหตุ</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((inc) => (
                <TableRow key={inc.id}>
                  <TableCell>{inc.installment}</TableCell>
                  <TableCell>{formatThaiDate(inc.receivedDate)}</TableCell>
                  <TableCell>{inc.documentNo}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(inc.amount)}</TableCell>
                  <TableCell className="max-w-[160px] truncate text-muted-foreground">{inc.notes || "-"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(inc); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(inc)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขรายรับ" : "บันทึกรายรับใหม่"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>งวด</Label>
                <Input {...register("installment")} placeholder="เช่น งวดที่ 1" />
                {errors.installment && <p className="text-xs text-destructive">{errors.installment.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>วันที่รับเงิน</Label>
                <Input type="date" {...register("receivedDate")} />
                {errors.receivedDate && <p className="text-xs text-destructive">{errors.receivedDate.message}</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>เลขที่เอกสาร</Label>
                <Input {...register("documentNo")} />
                {errors.documentNo && <p className="text-xs text-destructive">{errors.documentNo.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>จำนวนเงิน (บาท)</Label>
                <Input type="number" step="0.01" {...register("amount")} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>หมายเหตุ</Label>
              <Textarea {...register("notes")} />
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
            <DialogTitle>ยืนยันการลบรายรับ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">คุณต้องการลบรายรับงวด &ldquo;{deleteTarget?.installment}&rdquo; ใช่หรือไม่</p>
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
