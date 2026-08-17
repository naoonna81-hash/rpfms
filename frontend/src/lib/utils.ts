import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** แปลงตัวเลขเป็นรูปแบบเงินบาทไทย เช่น 1,234,567.89 */
export function formatCurrency(value: number | string | null | undefined, opts?: { withSymbol?: boolean }): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  const formatted = new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return opts?.withSymbol ? `${formatted} บาท` : formatted;
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("th-TH").format(n);
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** แปลง ISO date เป็นรูปแบบไทย พ.ศ. เช่น 15 สิงหาคม 2569 */
export function formatThaiDate(iso: string | Date | null | undefined, opts?: { short?: boolean }): string {
  if (!iso) return "-";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const month = opts?.short ? THAI_MONTHS_SHORT[d.getMonth()] : THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

export function formatThaiMonthYear(iso: string | Date | null | undefined): string {
  if (!iso) return "-";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "-";
  return `${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** วันที่แบบ ISO (yyyy-MM-dd) สำหรับส่งค่า form */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function thaiFiscalYear(date = new Date()): number {
  return date.getFullYear() + 543;
}

export function debounce<T extends (...args: never[]) => void>(fn: T, delay = 350) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
