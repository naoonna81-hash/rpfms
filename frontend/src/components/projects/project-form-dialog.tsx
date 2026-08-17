"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectsApi } from "@/lib/api/endpoints";
import { ApiClientError } from "@/lib/api/client";
import type { Project } from "@/types";

const schema = z.object({
  code: z.string().min(1, "กรุณากรอกรหัสโครงการ"),
  nameTh: z.string().min(1, "กรุณากรอกชื่อโครงการ (ไทย)"),
  nameEn: z.string().optional(),
  principalInvestigator: z.string().min(1, "กรุณากรอกชื่อหัวหน้าโครงการ"),
  fiscalYear: z.coerce.number().min(2500, "ปีงบประมาณไม่ถูกต้อง"),
  startDate: z.string().min(1, "กรุณาเลือกวันที่เริ่มโครงการ"),
  endDate: z.string().min(1, "กรุณาเลือกวันที่สิ้นสุดโครงการ"),
  totalBudget: z.coerce.number().min(0, "งบประมาณต้องไม่ติดลบ"),
  status: z.enum(["ACTIVE", "COMPLETED", "SUSPENDED", "CLOSED"]),
});
type FormValues = z.infer<typeof schema>;

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!project;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "ACTIVE", fiscalYear: 2569 },
  });

  useEffect(() => {
    if (open) {
      if (project) {
        reset({
          code: project.code,
          nameTh: project.nameTh,
          nameEn: project.nameEn ?? "",
          principalInvestigator: project.principalInvestigator,
          fiscalYear: project.fiscalYear,
          startDate: project.startDate?.slice(0, 10),
          endDate: project.endDate?.slice(0, 10),
          totalBudget: project.totalBudget,
          status: project.status,
        });
      } else {
        reset({ code: "", nameTh: "", nameEn: "", principalInvestigator: "", fiscalYear: 2569, startDate: "", endDate: "", totalBudget: 0, status: "ACTIVE" });
      }
    }
  }, [open, project, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? projectsApi.update(project!.id, values) : projectsApi.create(values),
    onSuccess: () => {
      toast.success(isEdit ? "แก้ไขโครงการสำเร็จ" : "สร้างโครงการใหม่สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
    },
    onError: (e) => {
      toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขโครงการวิจัย" : "สร้างโครงการวิจัยใหม่"}</DialogTitle>
          <DialogDescription>กรอกข้อมูลโครงการให้ครบถ้วนตามมาตรฐาน สวรส.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>รหัสโครงการ</Label>
              <Input placeholder="เช่น MASLD-2569" {...register("code")} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>ปีงบประมาณ (พ.ศ.)</Label>
              <Input type="number" {...register("fiscalYear")} />
              {errors.fiscalYear && <p className="text-xs text-destructive">{errors.fiscalYear.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อโครงการ (ไทย)</Label>
            <Input {...register("nameTh")} />
            {errors.nameTh && <p className="text-xs text-destructive">{errors.nameTh.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อโครงการ (อังกฤษ)</Label>
            <Input {...register("nameEn")} />
          </div>
          <div className="space-y-1.5">
            <Label>หัวหน้าโครงการ</Label>
            <Input {...register("principalInvestigator")} />
            {errors.principalInvestigator && <p className="text-xs text-destructive">{errors.principalInvestigator.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>วันที่เริ่มโครงการ</Label>
              <Input type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>วันที่สิ้นสุดโครงการ</Label>
              <Input type="date" {...register("endDate")} />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>งบประมาณรวม (บาท)</Label>
              <Input type="number" step="0.01" {...register("totalBudget")} />
              {errors.totalBudget && <p className="text-xs text-destructive">{errors.totalBudget.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>สถานะ</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormValues["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ดำเนินการอยู่</SelectItem>
                  <SelectItem value="COMPLETED">เสร็จสิ้น</SelectItem>
                  <SelectItem value="SUSPENDED">ระงับชั่วคราว</SelectItem>
                  <SelectItem value="CLOSED">ปิดโครงการ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {(isSubmitting || mutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
