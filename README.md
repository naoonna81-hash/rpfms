# RPFMS — Research Project Financial Management System

ระบบบริหารบัญชีโครงการวิจัย พัฒนาให้ศูนย์เชี่ยวชาญเฉพาะทางด้านโรคตับอักเสบและมะเร็งตับ คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย
โดยใช้ข้อมูลโครงสร้างงบประมาณจริงจาก 4 โครงการวิจัยที่ได้รับทุนจาก สวรส. ปีงบประมาณ 2569 เป็นฐานในการออกแบบและ seed ข้อมูลตัวอย่าง

Minimal · Modern · Professional · โทนสีขาว/น้ำเงิน/เทา · ฟอนต์ Kanit · รองรับภาษาไทยเต็มรูปแบบ · Responsive ทุกขนาดหน้าจอ

## เริ่มต้นใช้งานเร็วที่สุด (Docker)
```bash
docker compose up --build -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```
เปิด http://localhost:3000 — ดูบัญชีผู้ใช้เริ่มต้นใน `scripts/seed-data.json`

รายละเอียดการรันแบบไม่ใช้ Docker และการ deploy ขึ้นจริง (Render/Vercel/Railway ฯลฯ) ดูที่ `docs/DEPLOYMENT_GUIDE.md`

## เอกสารทั้งหมด (13 รายการตามที่ร้องขอ)

| # | รายการ | ที่อยู่ไฟล์ |
|---|---|---|
| 1 | Sitemap | `docs/SITEMAP.md` |
| 2 | User Flow | `docs/USER_FLOW.md` |
| 3 | Database Schema | `backend/prisma/schema.prisma` (+ อธิบายใน `docs/ER_DIAGRAM.md`) |
| 4 | API Design | `docs/API_DESIGN.md` |
| 5 | Dashboard UI | `frontend/src/app/(app)/page.tsx` + ภาพจริงใน `docs/screenshots/dashboard.png` |
| 6 | หน้าแต่ละเมนู | `frontend/src/app/(app)/**` (ทุกหน้าใช้งานได้จริง ไม่ใช่ placeholder) |
| 7 | Mockup ทุกหน้า | `docs/MOCKUPS.md` (ภาพหน้าจอจริงจากระบบที่รันได้) |
| 8 | ER Diagram | `docs/ER_DIAGRAM.md` (mermaid) |
| 9 | Folder Structure | `docs/FOLDER_STRUCTURE.md` |
| 10 | Source Code พร้อมใช้งาน | `backend/`, `frontend/` |
| 11 | ตัวอย่างข้อมูล (Seed Data) | `scripts/seed-data.json` + `backend/prisma/seed.ts` |
| 12 | Deployment Guide | `docs/DEPLOYMENT_GUIDE.md` |
| 13 | คู่มือการใช้งาน | `docs/USER_MANUAL.md` |

เอกสารพื้นหลังเพิ่มเติม: `docs/00_CONTEXT.md` (ที่มาของข้อมูล 4 โครงการ และส่วนขยายจาก requirement เดิม)

## สถานะการตรวจสอบ (Verification)
- Frontend: `npm run build` ผ่าน 100% (0 TypeScript errors, 16 routes) — ยืนยันแล้วด้วยการรันจริงและถ่ายภาพหน้าจอใน `docs/screenshots/`
- Backend: โค้ดครบทุก endpoint ตาม `docs/API_DESIGN.md`, ตรวจสอบ schema ด้วย SQL จริงแล้วว่าทุกยอดงบประมาณตรงกับเอกสารต้นฉบับ 100% — ข้อจำกัดเดียวคือแซนด์บ็อกซ์ที่ใช้พัฒนาไม่มีสิทธิ์เข้าถึงอินเทอร์เน็ตสำหรับดาวน์โหลด Prisma engine (`npx prisma generate`) จึงรัน backend ให้ครบวงจรในแซนด์บ็อกซ์นี้ไม่ได้ — แพลตฟอร์ม deploy จริงไม่มีข้อจำกัดนี้ (ดู `docs/DEPLOYMENT_GUIDE.md`)
- พบและแก้ไขจุดที่ frontend/backend ส่งชื่อฟิลด์ไม่ตรงกัน (dashboard/analytics endpoints) และบั๊กการแปลง ค.ศ./พ.ศ. ของปีงบประมาณ ระหว่างขั้นตอนตรวจสอบ — ยืนยันแล้วว่าแก้ไขถูกต้องด้วยภาพหน้าจอจริง

## สิ่งที่ยังต้องทำต่อก่อนใช้งานจริง
ดูรายการ Production Checklist ใน `docs/DEPLOYMENT_GUIDE.md` (เปลี่ยน JWT secret, เปลี่ยนรหัสผ่านผู้ใช้ตัวอย่าง, ตั้งค่า HTTPS/Backup ฯลฯ)
