"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiClientError } from "@/lib/api/client";

const schema = z
  .object({
    name: z.string().min(2, "กรุณากรอกชื่อ-นามสกุล อย่างน้อย 2 ตัวอักษร"),
    email: z.string().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
    password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await registerUser(values.name, values.email, values.password);
      toast.success("ลงทะเบียนสำเร็จ");
      router.push("/");
    } catch (e) {
      if (e instanceof ApiClientError) {
        setServerError(e.code === "CONFLICT" ? "อีเมลนี้ถูกใช้งานแล้ว" : e.message);
      } else {
        setServerError("เกิดข้อผิดพลาด ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      }
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>ลงทะเบียนผู้ใช้ใหม่</CardTitle>
        <CardDescription>สร้างบัญชีเพื่อใช้งานระบบ RPFMS</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">ชื่อ-นามสกุล</Label>
            <Input id="name" placeholder="เช่น รศ.พญ.มณีรัตน์ ชยานุภัทร์กุล" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">อีเมล</Label>
            <Input id="email" type="email" placeholder="you@chula.ac.th" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            ลงทะเบียน
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            มีบัญชีอยู่แล้ว?{" "}
            <Link href="/login" className="text-primary hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
