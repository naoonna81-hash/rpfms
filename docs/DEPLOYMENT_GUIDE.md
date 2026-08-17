# Deployment Guide — RPFMS

## ตัวเลือกที่ 1: รันในเครื่อง/เซิร์ฟเวอร์ตัวเองด้วย Docker (เร็วที่สุด)

ต้องมี Docker + Docker Compose ติดตั้งแล้ว

```bash
cd rpfms
docker compose up --build -d          # ขึ้น postgres + backend + frontend
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api/v1
- เข้าสู่ระบบด้วยบัญชีแอดมินที่ seed ไว้ (ดูอีเมล/รหัสผ่านใน `scripts/seed-data.json` → `admin`) ผู้ใช้อื่นในระบบใช้รหัสผ่านเริ่มต้น `Welcome@2569`
- **สำคัญ**: เปลี่ยนค่า `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` ใน `docker-compose.yml` (หรือ `.env`) ก่อนใช้งานจริง และเปลี่ยนรหัสผ่านผู้ใช้ทุกคนหลัง seed

## ตัวเลือกที่ 2: Deploy ขึ้นคลาวด์ให้ใช้งานได้จริงผ่าน URL

ระบบนี้ประกอบด้วย 3 ส่วนที่ต้อง deploy แยกกัน (หรือรวมในแพลตฟอร์มเดียวที่รองรับทั้งสามอย่าง):

| ส่วน | ต้องการ | ตัวเลือกแพลตฟอร์มที่แนะนำ |
|---|---|---|
| PostgreSQL Database | managed Postgres | Render, Railway, Supabase, Neon |
| Backend (Node/Express) | รัน Node process ต่อเนื่อง 24/7 + persistent disk สำหรับไฟล์แนบ | Render (Web Service), Railway |
| Frontend (Next.js) | Node/Edge runtime | Vercel (แนะนำสำหรับ Next.js), Render (Static/Web Service) |

### แนะนำ: Render (ครบในที่เดียว — DB + Backend + Frontend)
1. สร้าง **PostgreSQL** instance บน Render → คัดลอก Internal Database URL
2. สร้าง **Web Service** จาก `backend/` (Docker หรือ Node runtime) → ตั้งค่า Environment Variables ตาม `backend/.env.example` โดยใส่ `DATABASE_URL` จากข้อ 1 → Build Command: `npm install && npx prisma generate && npx prisma migrate deploy` → Start Command: `npm run start`
3. รัน seed ครั้งเดียวผ่าน Render Shell: `npm run seed`
4. สร้าง **Web Service** อีกตัวจาก `frontend/` → ตั้ง `NEXT_PUBLIC_API_URL` เป็น URL ของ backend service จากข้อ 2 (`https://<backend>.onrender.com/api/v1`) → Build Command: `npm install && npm run build` → Start Command: `npm run start`
5. กลับไปที่ backend service → ตั้ง `CORS_ORIGIN` เป็น URL ของ frontend จากข้อ 4 → Redeploy

### ทางเลือก: Vercel (Frontend) + Railway/Supabase (Backend + DB)
- Frontend: เชื่อม repo เข้ากับ Vercel → ตั้ง `NEXT_PUBLIC_API_URL` ใน Vercel Environment Variables → deploy อัตโนมัติ
- Backend + DB: สร้างบน Railway (หรือใช้ Supabase Postgres + รัน backend บน Railway/Render) → ตั้งค่าเหมือนข้อ 2–3 ด้านบน

### หมายเหตุสำคัญเรื่อง Prisma
คำสั่ง `npx prisma generate` และ `npx prisma migrate` ต้องดาวน์โหลด query engine จาก `binaries.prisma.sh` ในขั้นตอน build — แพลตฟอร์ม hosting ทั่วไป (Render/Railway/Vercel) มีอินเทอร์เน็ตปกติจึงไม่มีปัญหา ต่างจากแซนด์บ็อกซ์พัฒนาที่ใช้สร้างระบบนี้ซึ่งถูกจำกัดเครือข่ายและรันคำสั่งนี้ไม่ได้ (ดูรายละเอียดใน `backend/README.md` §8) — ให้รันคำสั่งเหล่านี้บนแพลตฟอร์ม deploy จริงหรือเครื่องที่มีอินเทอร์เน็ตปกติเท่านั้น

## ตัวแปรแวดล้อมที่ต้องตั้งค่าจริงก่อนใช้งาน (Production Checklist)
- [ ] `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — สุ่มค่าใหม่ (เช่น `openssl rand -hex 64`) ห้ามใช้ค่าตัวอย่าง
- [ ] `DATABASE_URL` — ชี้ไปที่ Postgres จริง พร้อม SSL (`?sslmode=require` ถ้าแพลตฟอร์มต้องการ)
- [ ] `CORS_ORIGIN` — โดเมนจริงของ frontend เท่านั้น (ห้ามเปิดกว้าง `*` ใน production)
- [ ] `NEXT_PUBLIC_API_URL` — โดเมนจริงของ backend
- [ ] `UPLOAD_DIR` — ถ้า deploy บนแพลตฟอร์มที่ disk ไม่ persistent (เช่น serverless) ให้เปลี่ยนไปใช้ cloud storage (S3-compatible) แทน local disk — ดูจุดเชื่อมต่อใน `backend/src/middleware/upload.ts`
- [ ] เปลี่ยนรหัสผ่านผู้ใช้ทุกคนที่มาจาก seed data ทันทีหลัง deploy จริง
- [ ] ตั้ง HTTPS/SSL ให้ทั้ง frontend และ backend (แพลตฟอร์มส่วนใหญ่ทำให้อัตโนมัติ)
- [ ] ตั้ง Auto Backup ของฐานข้อมูล (Render/Railway/Supabase มีตัวเลือกนี้ในแผนเสียเงิน — ตรงกับความต้องการ "Auto Backup Database" ในสเปก)

## การอัปเดตระบบหลัง deploy
```bash
git pull
npx prisma migrate deploy   # เมื่อมีการแก้ schema
npm run build && npm run start   # หรือให้แพลตฟอร์ม auto-deploy จาก git push
```
