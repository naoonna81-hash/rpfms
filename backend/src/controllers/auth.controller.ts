import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError';
import { ok, created } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import {
  clearRefreshCookie,
  getRefreshCookie,
  issueTokenPair,
  revokeRefreshToken,
  rotateRefreshToken,
  setRefreshCookie,
} from '../services/token.service';
import { LoginInput, RegisterInput, UpdateMeInput } from '../validators/auth.validators';

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body as RegisterInput;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('อีเมลนี้ถูกใช้งานแล้ว');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'USER' },
    select: PUBLIC_USER_SELECT,
  });

  const { accessToken, refreshToken } = await issueTokenPair(user);
  setRefreshCookie(res, refreshToken);
  req.auditContext = { entityType: 'auth', action: 'CREATE', entityId: user.id, newValue: { email } };
  return created(res, { user, accessToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw ApiError.unauthorized('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw ApiError.unauthorized('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

  const { accessToken, refreshToken } = await issueTokenPair(user);
  setRefreshCookie(res, refreshToken);

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'LOGIN', entityType: 'auth', entityId: user.id, ipAddress: req.ip },
  });

  const { passwordHash: _ph, ...publicUser } = user;
  return ok(res, { user: publicUser, accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = getRefreshCookie(req.cookies ?? {});
  if (!token) throw ApiError.unauthorized('ไม่พบ Refresh Token');

  let result;
  try {
    result = await rotateRefreshToken(token);
  } catch {
    result = null;
  }
  if (!result) {
    clearRefreshCookie(res);
    throw ApiError.unauthorized('Refresh Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }

  setRefreshCookie(res, result.refreshToken);
  return ok(res, { accessToken: result.accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = getRefreshCookie(req.cookies ?? {});
  if (token) await revokeRefreshToken(token);
  clearRefreshCookie(res);
  return ok(res, { loggedOut: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: PUBLIC_USER_SELECT });
  if (!user) throw ApiError.notFound('ไม่พบผู้ใช้');
  return ok(res, user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateMeInput;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw ApiError.notFound('ไม่พบผู้ใช้');

  const data: { name?: string; avatarUrl?: string | null; passwordHash?: string } = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;

  if (input.newPassword) {
    const match = await bcrypt.compare(input.currentPassword!, user.passwordHash);
    if (!match) throw ApiError.validation('รหัสผ่านเดิมไม่ถูกต้อง');
    data.passwordHash = await bcrypt.hash(input.newPassword, 10);
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data, select: PUBLIC_USER_SELECT });
  req.auditContext = { entityType: 'users', entityId: user.id, action: 'UPDATE' };
  return ok(res, updated);
});
