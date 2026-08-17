import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createWorker } from 'tesseract.js';

const execFileAsync = promisify(execFile);

export interface OcrFieldResult<T> {
  value: T | null;
  confidence: number; // 0-1
  raw?: string;
}

export interface OcrExtractedFields {
  date: OcrFieldResult<string>; // ISO date string (YYYY-MM-DD) in Gregorian calendar
  amount: OcrFieldResult<number>;
  documentNo: OcrFieldResult<string>;
}

export interface OcrResult {
  text: string;
  fields: OcrExtractedFields;
}

/**
 * Clean, swappable OCR/IDP interface. Today this runs tesseract.js (lang: tha+eng) plus
 * heuristic regex extraction. It can be swapped/augmented later with an LLM-based
 * extractor (e.g. Claude) without touching the route layer - callers only depend on
 * extractFromDocument(filePath) -> { text, fields }.
 */
export async function extractFromDocument(filePath: string): Promise<OcrResult> {
  const imagePath = await ensureImageFile(filePath);
  let cleanupImage: string | null = imagePath !== filePath ? imagePath : null;

  try {
    const text = await runTesseract(imagePath);
    const fields = extractFields(text);
    return { text, fields };
  } finally {
    if (cleanupImage) {
      fs.promises.unlink(cleanupImage).catch(() => undefined);
    }
  }
}

/** If the input is a PDF, rasterize page 1 to a PNG using `pdftoppm` (Poppler) and return that path. */
async function ensureImageFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.pdf') return filePath;

  const outPrefix = path.join(os.tmpdir(), `rpfms-ocr-${crypto.randomUUID()}`);
  // pdftoppm -png -f 1 -l 1 -r 300 input.pdf outPrefix  => outPrefix-1.png
  await execFileAsync('pdftoppm', ['-png', '-f', '1', '-l', '1', '-r', '300', filePath, outPrefix]);

  const candidates = [`${outPrefix}-1.png`, `${outPrefix}-01.png`, `${outPrefix}.png`];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // Fallback: find any file starting with outPrefix
  const dir = path.dirname(outPrefix);
  const base = path.basename(outPrefix);
  const found = fs.readdirSync(dir).find((f) => f.startsWith(base));
  if (found) return path.join(dir, found);

  throw new Error('pdftoppm ไม่สามารถแปลง PDF เป็นภาพได้');
}

async function runTesseract(imagePath: string): Promise<string> {
  const worker = await createWorker('tha+eng');
  try {
    const { data } = await worker.recognize(imagePath);
    return data.text ?? '';
  } finally {
    await worker.terminate();
  }
}

// ---------------------------------------------------------------------------
// Heuristic extraction
// ---------------------------------------------------------------------------

const THAI_DIGITS: Record<string, string> = {
  '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
  '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
};

function normalizeThaiDigits(input: string): string {
  return input.replace(/[๐-๙]/g, (d) => THAI_DIGITS[d] ?? d);
}

const THAI_MONTHS: Record<string, number> = {
  'มกราคม': 1, 'ม.ค.': 1, 'กุมภาพันธ์': 2, 'ก.พ.': 2, 'มีนาคม': 3, 'มี.ค.': 3,
  'เมษายน': 4, 'เม.ย.': 4, 'พฤษภาคม': 5, 'พ.ค.': 5, 'มิถุนายน': 6, 'มิ.ย.': 6,
  'กรกฎาคม': 7, 'ก.ค.': 7, 'สิงหาคม': 8, 'ส.ค.': 8, 'กันยายน': 9, 'ก.ย.': 9,
  'ตุลาคม': 10, 'ต.ค.': 10, 'พฤศจิกายน': 11, 'พ.ย.': 11, 'ธันวาคม': 12, 'ธ.ค.': 12,
};

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Extracts a candidate date, amount, and document number from raw OCR text. */
export function extractFields(rawText: string): OcrExtractedFields {
  const text = normalizeThaiDigits(rawText);
  return {
    date: extractDate(text),
    amount: extractAmount(text),
    documentNo: extractDocumentNo(text),
  };
}

function extractDate(text: string): OcrFieldResult<string> {
  // 1) Thai month name form: "15 มกราคม 2569" or "15 ม.ค. 2569"
  const monthNamesPattern = Object.keys(THAI_MONTHS)
    .sort((a, b) => b.length - a.length)
    .map((m) => m.replace(/\./g, '\\.'))
    .join('|');
  const thaiMonthRegex = new RegExp(`(\\d{1,2})\\s*(${monthNamesPattern})\\s*(\\d{4})`, 'u');
  const thaiMatch = text.match(thaiMonthRegex);
  if (thaiMatch) {
    const day = parseInt(thaiMatch[1], 10);
    const monthKey = Object.keys(THAI_MONTHS).find(
      (k) => k.toLowerCase() === thaiMatch[2].toLowerCase()
    );
    const month = monthKey ? THAI_MONTHS[monthKey] : undefined;
    let year = parseInt(thaiMatch[3], 10);
    if (year > 2400) year -= 543; // พ.ศ. -> ค.ศ.
    if (month && day >= 1 && day <= 31) {
      return {
        value: `${year}-${pad2(month)}-${pad2(day)}`,
        confidence: 0.85,
        raw: thaiMatch[0],
      };
    }
  }

  // 2) Numeric DD/MM/YYYY or DD-MM-YYYY (supports both ค.ศ. and พ.ศ. years)
  const numericRegex = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/;
  const numMatch = text.match(numericRegex);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const month = parseInt(numMatch[2], 10);
    let year = parseInt(numMatch[3], 10);
    if (year > 2400) year -= 543;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return {
        value: `${year}-${pad2(month)}-${pad2(day)}`,
        confidence: 0.65,
        raw: numMatch[0],
      };
    }
  }

  return { value: null, confidence: 0 };
}

function extractAmount(text: string): OcrFieldResult<number> {
  // Prefer amounts near keywords "รวม", "รวมเงิน", "จำนวนเงิน", "บาท", "Total", "Amount"
  const keywordRegex =
    /(?:รวมเงิน|รวมทั้งสิ้น|รวม(?:ทั้งหมด)?|จำนวนเงิน|ยอดรวม|Total\s*Amount|Grand\s*Total|Total|Amount)\D{0,15}([\d,]+\.\d{2}|[\d,]{1,12})\s*(?:บาท|THB|Baht)?/giu;
  let best: { value: number; raw: string } | null = null;
  let m: RegExpExecArray | null;
  while ((m = keywordRegex.exec(text)) !== null) {
    const num = parseFloat(m[1].replace(/,/g, ''));
    if (!Number.isNaN(num) && (best === null || num > best.value)) {
      best = { value: num, raw: m[0] };
    }
  }
  if (best) {
    return { value: best.value, confidence: 0.8, raw: best.raw };
  }

  // Fallback: any "1,234.00 บาท" pattern in the document, take the largest as a guess
  const bahtRegex = /([\d,]+\.\d{2})\s*บาท/gu;
  let fallbackBest: { value: number; raw: string } | null = null;
  while ((m = bahtRegex.exec(text)) !== null) {
    const num = parseFloat(m[1].replace(/,/g, ''));
    if (!Number.isNaN(num) && (fallbackBest === null || num > fallbackBest.value)) {
      fallbackBest = { value: num, raw: m[0] };
    }
  }
  if (fallbackBest) {
    return { value: fallbackBest.value, confidence: 0.5, raw: fallbackBest.raw };
  }

  return { value: null, confidence: 0 };
}

function extractDocumentNo(text: string): OcrFieldResult<string> {
  const patterns: Array<{ regex: RegExp; confidence: number }> = [
    { regex: /เลขที่\s*[:\-]?\s*([A-Za-z0-9\-\/]{3,20})/u, confidence: 0.8 },
    { regex: /\b(INV[-\/]?[A-Za-z0-9]{2,15})\b/i, confidence: 0.75 },
    { regex: /\b(RC[-\/]?[A-Za-z0-9]{2,15})\b/i, confidence: 0.75 },
    { regex: /เลขที่ใบเสร็จ\s*[:\-]?\s*([A-Za-z0-9\-\/]{3,20})/u, confidence: 0.85 },
    { regex: /No\.?\s*[:\-]?\s*([A-Za-z0-9\-\/]{3,20})/i, confidence: 0.5 },
  ];

  for (const { regex, confidence } of patterns) {
    const m = text.match(regex);
    if (m) {
      return { value: m[1].trim(), confidence, raw: m[0] };
    }
  }
  return { value: null, confidence: 0 };
}
