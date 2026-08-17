# RPFMS Frontend

ระบบบริหารบัญชีโครงการวิจัย (Research Project Financial Management System) — ส่วนหน้าเว็บแอปพลิเคชัน
พัฒนาให้ศูนย์เชี่ยวชาญเฉพาะทางด้านโรคตับอักเสบและมะเร็งตับ คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย

## สแตกเทคโนโลยี

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (Radix primitives)
- ฟอนต์ Kanit (Thai + Latin) เป็นฟอนต์หลักทั้งระบบ
- @tanstack/react-query สำหรับ data fetching/caching
- @tanstack/react-table สำหรับตารางข้อมูล (sort/paginate/filter)
- Recharts สำหรับกราฟ (สีชุดกราฟผ่านการตรวจสอบ colorblind-safe ตาม dataviz guideline)
- next-themes สำหรับสลับโหมด light/dark
- react-hook-form + zod สำหรับฟอร์มและ validation

## เริ่มต้นใช้งาน

```bash
cp .env.example .env.local   # ตั้งค่า NEXT_PUBLIC_API_URL ให้ตรงกับ backend
npm install
npm run dev                  # http://localhost:3000
```

### คำสั่งอื่นๆ

```bash
npm run build   # build สำหรับ production (ต้องผ่านโดยไม่มี TypeScript error)
npm run start   # รันไฟล์ build แล้ว
npm run lint    # ตรวจสอบโค้ดด้วย ESLint
```

### รันด้วย Docker

```bash
docker build -t rpfms-frontend --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1 .
docker run -p 3000:3000 rpfms-frontend
```

## โครงสร้างหลัก

```
src/
  app/
    (auth)/login, (auth)/register        — หน้าเข้าสู่ระบบ/ลงทะเบียน (ไม่มี sidebar)
    (app)/...                            — ทุกหน้าในระบบหลัก (มี AppShell + AuthGuard)
      page.tsx                           — แดชบอร์ด
      projects, projects/[id]            — โครงการวิจัย + หมวดงบ/สมาชิก/รายรับ/Work Package
      expenses, expenses/new, expenses/[id]  — ระบบเบิกจ่าย + OCR
      approvals                          — ระบบอนุมัติ
      analytics                          — วิเคราะห์งบประมาณ (burn rate, utilization)
      reports                            — ออกรายงาน PDF/Excel/CSV
      search                             — ค้นหาแบบรวมศูนย์
      notifications                      — การแจ้งเตือน
      settings                           — โปรไฟล์/รหัสผ่าน/จัดการผู้ใช้
  components/
    ui/          — shadcn/ui primitives
    layout/      — Sidebar, Topbar, AppShell, mobile drawer/bottom nav
    shared/      — DataTable, StatCard, สถานะ loading/empty/error, ฯลฯ
    dashboard/, analytics/, projects/, expenses/, approvals/ — ส่วนประกอบเฉพาะหน้า
  lib/
    api/client.ts     — fetch wrapper + JWT refresh flow
    api/endpoints.ts  — endpoint ทั้งหมดตาม docs/API_DESIGN.md
    auth/             — token store + AuthProvider (useAuth)
    utils.ts          — คูปองฟอร์แมตเงินบาท/วันที่ไทย (พ.ศ.)
  types/        — ชนิดข้อมูลตรงกับ ER diagram / API contract
```

## Auth token flow

- `access token` เก็บไว้ใน memory เป็นหลัก (`src/lib/auth/token-store.ts`) และ fallback ไปที่ `localStorage`
  (คีย์ `rpfms_access_token`) เพื่อให้ session อยู่รอดหลัง refresh หน้าเว็บ
- `refresh token` เป็น httpOnly cookie ที่ backend ตั้งให้ (`credentials: "include"` ทุก request) — ฝั่ง client ไม่แตะต้องค่านี้โดยตรง
- ทุก request ผ่าน `apiFetch`/`apiFetchList` (`src/lib/api/client.ts`) จะแนบ `Authorization: Bearer <accessToken>` อัตโนมัติ
- เมื่อได้ `401` ระบบจะเรียก `POST /auth/refresh` หนึ่งครั้ง (กันการเรียกซ้ำซ้อนด้วย promise เดียวที่แชร์กัน) แล้ว retry
  request เดิมอัตโนมัติ ถ้า refresh ไม่สำเร็จจะล้าง token และ redirect ไป `/login?next=...`
- `AuthProvider` (`src/lib/auth/auth-context.tsx`) โหลดผู้ใช้ปัจจุบันจาก `GET /auth/me` ตอนเปิดแอป และเปิดให้ทุกหน้าภายใต้
  กลุ่ม route `(app)` ใช้ผ่าน `useAuth()`; หน้าใน `(app)` ทั้งหมดถูกป้องกันด้วย auth guard ใน `app/(app)/layout.tsx`

## หมายเหตุ

- ทุกข้อความในหน้าเว็บเป็นภาษาไทยตามข้อกำหนด ส่วนค่าที่เก็บ/ส่งไป backend ยังเป็น ISO date และปี ค.ศ. ตาม contract
  (แปลงเป็น พ.ศ. เฉพาะตอนแสดงผลด้วย `formatThaiDate` / `thaiFiscalYear` ใน `src/lib/utils.ts`)
- ฟีเจอร์ OCR (`src/components/expenses/ocr-panel.tsx`) ออกแบบให้เป็นตัวช่วย (human-in-the-loop) เสมอ — ผู้ใช้ต้องกด
  "ใช้ค่านี้" ยืนยันทีละฟิลด์ก่อนนำค่าที่ตรวจพบไปกรอกในฟอร์มจริง พร้อมแสดงระดับความมั่นใจ (confidence) ของแต่ละฟิลด์
- backend ไม่จำเป็นต้องรันอยู่เพื่อให้ `npm run build` (production build) ผ่าน เพราะการเรียก API เกิดขึ้นตอน runtime เท่านั้น
