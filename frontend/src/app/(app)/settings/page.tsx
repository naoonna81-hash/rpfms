"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { useAuth } from "@/lib/auth/auth-context";
import { authApi, usersApi } from "@/lib/api/endpoints";
import { ApiClientError } from "@/lib/api/client";
import type { Role } from "@/types";

const profileSchema = z.object({
  name: z.string().min(2, "กรุณากรอกชื่อ-นามสกุล"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
    newPassword: z.string().min(8, "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "รหัสผ่านไม่ตรงกัน", path: ["confirmPassword"] });
type PasswordValues = z.infer<typeof passwordSchema>;

const roleLabel: Record<Role, string> = {
  SUPER_ADMIN: "ผู้ดูแลระบบสูงสุด",
  ADMIN: "ผู้ดูแลระบบ",
  RESEARCHER: "นักวิจัย",
  STAFF: "เจ้าหน้าที่",
  VIEWER: "ผู้เข้าชม",
};

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const isAdmin = user && ["SUPER_ADMIN", "ADMIN"].includes(user.role);

  return (
    <div className="space-y-5">
      <PageHeader title="ตั้งค่า/โปรไฟล์" description="จัดการข้อมูลส่วนตัวและการตั้งค่าระบบ" />
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">โปรไฟล์</TabsTrigger>
          <TabsTrigger value="password">เปลี่ยนรหัสผ่าน</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">จัดการผู้ใช้งาน</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <ProfileForm defaultValues={user} onSaved={refreshUser} />
        </TabsContent>
        <TabsContent value="password">
          <PasswordForm />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ProfileForm({ defaultValues, onSaved }: { defaultValues: { name: string; email: string } | null; onSaved: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (defaultValues) reset({ name: defaultValues.name, email: defaultValues.email });
  }, [defaultValues, reset]);

  const onSubmit = async (values: ProfileValues) => {
    try {
      await authApi.updateMe(values);
      toast.success("บันทึกข้อมูลโปรไฟล์สำเร็จ");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ข้อมูลส่วนตัว</CardTitle>
        <CardDescription>แก้ไขชื่อและอีเมลของบัญชีผู้ใช้</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 sm:max-w-md">
          <div className="space-y-1.5">
            <Label>ชื่อ-นามสกุล</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>อีเมล</Label>
            <Input type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            บันทึกการเปลี่ยนแปลง
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (values: PasswordValues) => {
    try {
      await authApi.updateMe({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
      reset();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>เปลี่ยนรหัสผ่าน</CardTitle>
        <CardDescription>ควรใช้รหัสผ่านที่คาดเดายากและไม่ซ้ำกับบัญชีอื่น</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 sm:max-w-md">
          <div className="space-y-1.5">
            <Label>รหัสผ่านปัจจุบัน</Label>
            <Input type="password" {...register("currentPassword")} />
            {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>รหัสผ่านใหม่</Label>
            <Input type="password" {...register("newPassword")} />
            {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>ยืนยันรหัสผ่านใหม่</Label>
            <Input type="password" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            เปลี่ยนรหัสผ่าน
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}

function UserManagement() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const query = useQuery({
    queryKey: ["users", q],
    queryFn: () => usersApi.list({ q: q || undefined, limit: 50 }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ role: Role; isActive: boolean }> }) => usersApi.update(id, data),
    onSuccess: () => {
      toast.success("อัปเดตข้อมูลผู้ใช้สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>จัดการผู้ใช้งานระบบ</CardTitle>
        <CardDescription>กำหนดสิทธิ์และเปิด/ปิดการใช้งานบัญชีผู้ใช้</CardDescription>
        <Input placeholder="ค้นหาชื่อหรืออีเมล..." className="mt-2 max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} />
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState title="ไม่พบผู้ใช้งาน" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>สิทธิ์</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => updateMutation.mutate({ id: u.id, data: { role: v as Role } })}>
                      <SelectTrigger className="w-40">
                        <SelectValue><Badge variant="gray">{roleLabel[u.role]}</Badge></SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(roleLabel) as Role[]).map((r) => (
                          <SelectItem key={r} value={r}>{roleLabel[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.isActive}
                        onCheckedChange={(checked) => updateMutation.mutate({ id: u.id, data: { isActive: checked } })}
                      />
                      <span className="text-xs text-muted-foreground">{u.isActive ? "ใช้งานอยู่" : "ปิดใช้งาน"}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
