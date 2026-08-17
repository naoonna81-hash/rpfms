import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import {
  hashToken,
  newJti,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { User } from '@prisma/client';

const REFRESH_COOKIE_NAME = 'rpfms_refresh_token';

export async function issueTokenPair(user: Pick<User, 'id' | 'email' | 'role'>) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  const jti = newJti();
  const refreshToken = signRefreshToken({ sub: user.id, jti });
  const expiresAt = new Date(Date.now() + env.jwtRefreshExpiresDays * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: env.jwtRefreshExpiresDays * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
}

export function getRefreshCookie(cookies: Record<string, string | undefined>): string | undefined {
  return cookies[REFRESH_COOKIE_NAME];
}

/** Rotates a refresh token: verifies signature + DB record, revokes the old row, issues a new pair. */
export async function rotateRefreshToken(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken); // throws if invalid/expired signature
  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (!stored || stored.userId !== payload.sub) return null;
  if (stored.tokenHash !== hashToken(refreshToken)) return null;
  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => undefined);
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || !user.isActive) return null;

  // Rotate: delete old row, issue a fresh pair
  await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => undefined);
  const pair = await issueTokenPair(user);
  return { user, ...pair };
}

export async function revokeRefreshToken(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.refreshToken.deleteMany({ where: { id: payload.jti, userId: payload.sub } });
  } catch {
    // token already invalid/expired - nothing to revoke
  }
}

export { REFRESH_COOKIE_NAME };
