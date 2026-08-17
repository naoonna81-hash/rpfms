"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { projectsApi } from "@/lib/api/endpoints";
import { ApiClientError } from "@/lib/api/client";
import type { ProjectMember, ProjectMemberRole } from "@/types";

const schema = z.object({
  email: z.string().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
});
type FormValues = z.infer<typeof schema>;

const roleLabel: Record<ProjectMemberRole, string> = { OWNER: "เจ้าของโครงการ", EDITOR: "แก้ไขได้", VIEWER: "ดูอย่างเดียว" };

export function MembersPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null);

  const query = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => projectsApi.members(projectId),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "VIEWER" },
  });

  const inviteMutation = useMutation({
    mutationFn: (values: FormValues) => projectsApi.addMember(projectId, values),
    onSuccess: () => {
      toast.success("เชิญสมาชิกสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
      setInviteOpen(false);
      reset({ email: "", role: "VIEWER" });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด"),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectMemberRole }) => projectsApi.updateMember(projectId, userId, { role }),
    onSuccess: () => {
      toast.success("แก้ไขสิทธิ์สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด"),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(projectId, userId),
    onSuccess: () => {
      toast.success("ถอดสิทธิ์สมาชิกสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
      setRemoveTarget(null);
    },
    onError: (e) => {
      toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด");
      setRemoveTarget(null);
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>สมาชิกและสิทธิ์การเข้าถึง</CardTitle>
          <CardDescription>เชิญบุคคลอื่นเข้าถึง/แก้ไขโครงการนี้ด้วยอีเมล</CardDescription>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> เชิญสมาชิก
        </Button>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState title="ยังไม่มีสมาชิกเพิ่มเติม" description="เชิญเพื่อนร่วมงานให้เข้าถึงโครงการนี้" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้ใช้</TableHead>
                <TableHead>สิทธิ์</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{m.user?.name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{m.user?.name ?? "-"}</p>
                        <p className="text-xs text-muted-foreground">{m.user?.email ?? "-"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={m.role}
                      onValueChange={(v) => roleMutation.mutate({ userId: m.userId, role: v as ProjectMemberRole })}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue>
                          <Badge variant={m.role === "OWNER" ? "info" : "gray"}>{roleLabel[m.role]}</Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">เจ้าของโครงการ</SelectItem>
                        <SelectItem value="EDITOR">แก้ไขได้</SelectItem>
                        <SelectItem value="VIEWER">ดูอย่างเดียว</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setRemoveTarget(m)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เชิญสมาชิกเข้าร่วมโครงการ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => inviteMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>อีเมล</Label>
              <Input type="email" {...register("email")} placeholder="colleague@chula.ac.th" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>สิทธิ์การเข้าถึง</Label>
              <Select value={watch("role")} onValueChange={(v) => setValue("role", v as FormValues["role"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">เจ้าของโครงการ</SelectItem>
                  <SelectItem value="EDITOR">แก้ไขได้</SelectItem>
                  <SelectItem value="VIEWER">ดูอย่างเดียว</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={isSubmitting || inviteMutation.isPending}>
                {(isSubmitting || inviteMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                เชิญสมาชิก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการถอดสิทธิ์สมาชิก</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">ต้องการถอดสิทธิ์ &ldquo;{removeTarget?.user?.name}&rdquo; ออกจากโครงการนี้ใช่หรือไม่</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => removeTarget && removeMutation.mutate(removeTarget.userId)} disabled={removeMutation.isPending}>
              {removeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              ถอดสิทธิ์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
