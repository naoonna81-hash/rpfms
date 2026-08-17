"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { projectsApi } from "@/lib/api/endpoints";
import { ApiClientError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อกิจกรรม"),
  budgetAllocated: z.coerce.number().min(0, "จำนวนเงินต้องไม่ติดลบ"),
});
type FormValues = z.infer<typeof schema>;

export function WorkPackagesPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ["work-packages", projectId],
    queryFn: () => projectsApi.workPackages(projectId),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => projectsApi.createWorkPackage(projectId, values),
    onSuccess: () => {
      toast.success("เพิ่มกิจกรรมสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["work-packages", projectId] });
      setOpen(false);
      reset({ name: "", budgetAllocated: 0 });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Work Package (กิจกรรมย่อย)</CardTitle>
          <CardDescription>แบ่งงบค่าดำเนินงานเป็นหลายกิจกรรมตามแผนงาน</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> เพิ่มกิจกรรม
        </Button>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState title="ยังไม่มีกิจกรรมย่อย" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อกิจกรรม</TableHead>
                <TableHead>งบที่จัดสรร</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((wp) => (
                <TableRow key={wp.id}>
                  <TableCell>{wp.name}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(wp.budgetAllocated)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>เพิ่ม Work Package</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>ชื่อกิจกรรม</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>งบที่จัดสรร (บาท)</Label>
              <Input type="number" step="0.01" {...register("budgetAllocated")} />
              {errors.budgetAllocated && <p className="text-xs text-destructive">{errors.budgetAllocated.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {(isSubmitting || mutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
