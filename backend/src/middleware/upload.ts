import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const expenseId = req.params.id ?? 'misc';
    const dir = path.join(env.uploadDir, 'expenses', expenseId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const uploadExpenseFile = multer({
  storage,
  limits: { fileSize: env.maxUploadSizeBytes },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error('รองรับเฉพาะไฟล์ PDF, JPG, PNG เท่านั้น'));
      return;
    }
    cb(null, true);
  },
});

const EXCEL_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]);

/** In-memory upload for import files (small spreadsheets), so we can parse the buffer directly. */
export const uploadImportFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadSizeBytes },
  fileFilter: (_req, file, cb) => {
    if (!EXCEL_MIME.has(file.mimetype)) {
      cb(new Error('รองรับเฉพาะไฟล์ Excel (.xlsx) หรือ CSV เท่านั้น'));
      return;
    }
    cb(null, true);
  },
});

export function fileTypeFromMime(mime: string): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime === 'image/png') return 'PNG';
  return 'JPG';
}
