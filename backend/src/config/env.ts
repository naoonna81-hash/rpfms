import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: required('DATABASE_URL'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  jwtRefreshExpiresDays: 7,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  uploadDir: path.isAbsolute(process.env.UPLOAD_DIR ?? './uploads')
    ? (process.env.UPLOAD_DIR as string)
    : path.join(process.cwd(), process.env.UPLOAD_DIR ?? './uploads'),
  maxUploadSizeBytes: parseInt(process.env.MAX_UPLOAD_SIZE_BYTES ?? '10485760', 10),
};
