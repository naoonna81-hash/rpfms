import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อ'),
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'),
});

export const loginSchema = z.object({
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณาระบุรหัสผ่าน'),
});

export const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
}).refine((d) => !d.newPassword || !!d.currentPassword, {
  message: 'ต้องระบุรหัสผ่านเดิมเพื่อเปลี่ยนรหัสผ่านใหม่',
  path: ['currentPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
