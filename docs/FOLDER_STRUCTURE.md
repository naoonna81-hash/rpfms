# Folder Structure — RPFMS

```
rpfms/
├── docker-compose.yml            # postgres + backend (+ frontend) สำหรับรันทั้งระบบด้วยคำสั่งเดียว
├── docs/                         # เอกสารทั้งหมด (สิ่งที่คุณกำลังอ่านอยู่นี้)
│   ├── 00_CONTEXT.md
│   ├── API_DESIGN.md
│   ├── ER_DIAGRAM.md
│   ├── SITEMAP.md
│   ├── USER_FLOW.md
│   ├── FOLDER_STRUCTURE.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── USER_MANUAL.md
│   └── screenshots/              # ภาพหน้าจอจริงจากระบบที่รันได้ (mockup)
│
├── backend/                      # Node.js + Express + TypeScript + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma         # นิยามตารางฐานข้อมูลทั้งหมด (source of truth)
│   │   ├── migrations/           # SQL migration ที่ generate จาก schema
│   │   └── seed.ts               # โหลด scripts/seed-data.json เข้าฐานข้อมูล
│   ├── src/
│   │   ├── server.ts             # entry point
│   │   ├── app.ts                # ประกอบ Express app (middleware, routes)
│   │   ├── config/env.ts         # อ่านและ validate environment variables
│   │   ├── routes/                # ผูก path กับ controller ต่อโมดูล (auth, projects, expenses, ...)
│   │   ├── controllers/           # request handler ต่อโมดูล
│   │   ├── services/              # business logic (budget, approval, ocr, notification, report/*)
│   │   ├── middleware/            # auth (JWT), auditLog, upload (multer), validate, errorHandler
│   │   ├── validators/            # zod schema ต่อโมดูล
│   │   ├── utils/                 # helper ทั่วไป (response envelope, jwt, pagination, ฯลฯ)
│   │   └── types/                 # ส่วนขยาย type ของ Express
│   ├── uploads/                   # ไฟล์แนบที่อัปโหลด (local storage; mount เป็น volume ใน production)
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md
│
├── frontend/                      # Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/            # /login, /register — layout แยกไม่มี sidebar
│   │   │   └── (app)/             # ทุกหน้าใน sidebar (dashboard, projects, expenses, ...)
│   │   ├── components/
│   │   │   ├── layout/            # sidebar, topbar, mobile nav, theme toggle
│   │   │   ├── dashboard/         # การ์ด/กราฟของหน้าแดชบอร์ด
│   │   │   ├── analytics/         # กราฟ burn-rate, top categories
│   │   │   ├── projects/, expenses/, approvals/   # component เฉพาะแต่ละโมดูล
│   │   │   ├── shared/            # DataTable, StatCard, states (loading/empty/error) ฯลฯ
│   │   │   └── ui/                # shadcn/ui primitives (button, dialog, table, ...)
│   │   ├── lib/
│   │   │   ├── api/               # client.ts (fetch wrapper + JWT refresh), endpoints.ts (endpoint map)
│   │   │   ├── auth/              # AuthProvider, token storage
│   │   │   └── utils.ts           # formatCurrency, formatThaiMonthYear, thaiFiscalYear ฯลฯ
│   │   └── types/index.ts         # type ทั้งหมดที่ตรงกับ API response (สัญญาระหว่าง FE/BE)
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md
│
└── scripts/
    └── seed-data.json              # ข้อมูลตัวอย่างจริงจาก 4 โครงการวิจัย (ใช้ตอน seed)
```

## หลักการสำคัญ
- **`docs/API_DESIGN.md` + `backend/prisma/schema.prisma` + `frontend/src/types/index.ts`** คือสัญญาระหว่าง frontend/backend — เพิ่มฟีเจอร์ใหม่ให้แก้ 3 ไฟล์นี้ให้ตรงกันเสมอ
- Backend แบ่งชั้นชัดเจน: route → controller → service → prisma เพื่อให้ทดสอบ/แก้ไข business logic ได้โดยไม่กระทบ HTTP layer
- Frontend ทุกหน้าเรียก API ผ่าน `lib/api/endpoints.ts` เดียว ไม่ยิง fetch ตรงในหน้า — เปลี่ยน base URL/พฤติกรรม auth ได้จุดเดียว
