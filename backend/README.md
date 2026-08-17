# RPFMS Backend

REST API backend for the Research Project Financial Management System (RPFMS) — built for
the Chulalongkorn University medical research center to manage research-grant finances
(budget categories, expense claims with an approval workflow, income, reports, OCR receipt
scanning) across multiple funded projects.

Stack: Node.js + Express + TypeScript, Prisma ORM + PostgreSQL, JWT auth, zod validation,
multer file uploads, tesseract.js OCR, exceljs/pdfkit/CSV reports.

## Contract

This backend implements:
- `prisma/schema.prisma` — the data model (do not rename models/fields without updating this too)
- `../docs/API_DESIGN.md` — the REST API contract (base path `/api/v1`)
- `../scripts/seed-data.json` — real seed data from 4 funded research proposals

## 1. Environment variables

Copy `.env.example` to `.env` and adjust as needed:

| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | - | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | - | use long random strings in prod |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | refresh token is also stored hashed in `refresh_tokens` |
| `PORT` | `4000` | |
| `CORS_ORIGIN` | `http://localhost:3000` | comma-separated list allowed |
| `UPLOAD_DIR` | `./uploads` | local folder for receipts; point at a mounted volume / future cloud storage path in production |
| `MAX_UPLOAD_SIZE_BYTES` | `10485760` (10MB) | |

## 2. Run locally (without Docker)

Prerequisites: Node.js 20+, a running PostgreSQL 14+ instance, and (for OCR) `tesseract`
and `pdftoppm` (Poppler) available on `PATH`.

```bash
cd backend
cp .env.example .env        # edit DATABASE_URL etc.
npm install
npx prisma generate         # generates the Prisma Client (needs internet access to
                             # binaries.prisma.sh - see "Known limitation" below)
npx prisma migrate dev --name init   # creates the database schema
npm run seed                 # loads scripts/seed-data.json (admin + 4 projects)
npm run dev                  # tsx watch, http://localhost:4000
```

Login with the seeded SUPER_ADMIN account (email/password are in `scripts/seed-data.json`
under `admin`). Every other seeded user (the 4 project leads + finance staff) gets the
password **`Welcome@2569`** — change it after first login via `PATCH /auth/me`.

## 3. Run locally (with Docker)

```bash
docker compose up --build
# then, once the backend container is up:
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

The compose file (`../docker-compose.yml`) starts a Postgres 16 container plus this
backend, wired together via `DATABASE_URL`.

## 4. Scripts

| Script | What it does |
|---|---|
| `npm run dev` | tsx watch mode |
| `npm run build` | `tsc` -> `dist/` |
| `npm start` | run compiled `dist/server.js` |
| `npm run prisma:generate` | `prisma generate` |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run seed` | loads `scripts/seed-data.json` into the DB (idempotent - re-running deletes and recreates each of the 4 seeded projects) |

## 5. OCR / IDP pipeline

`src/services/ocr.service.ts` exposes a single function:

```ts
extractFromDocument(filePath: string): Promise<{ text: string; fields: OcrExtractedFields }>
```

- JPG/PNG are OCR'd directly with `tesseract.js` (`lang: 'tha+eng'`).
- PDF uploads are rasterized (page 1, 300dpi) via the `pdftoppm` CLI (Poppler) into a temp
  PNG first, then OCR'd the same way.
- Heuristic regex extraction then pulls a candidate **date** (Thai Buddhist-era digits/month
  names and DD/MM/YYYY numeric forms), **total amount** (`รวม.../บาท/Total` patterns), and
  **document number** (`เลขที่`, `INV-`, `RC-` patterns), each with a 0-1 confidence score.
- Results are persisted on `ExpenseFile.ocrText` / `ocrExtractedData` and returned to the
  client for human review/correction before the expense is saved — human-in-the-loop by
  design, per the API spec.
- The interface is intentionally narrow so a future LLM-based extractor (e.g. Claude) can
  be swapped in or layered on top without touching the route layer.

Endpoint: `POST /api/v1/expenses/:id/files/:fileId/ocr`

## 6. Notifications

`src/services/notification.service.ts` scans all ACTIVE projects and idempotently creates
`Notification` rows for: `BUDGET_LOW` (>=80% utilization, project or category level),
`BUDGET_OVER` (>=100%), `PENDING_APPROVAL` (expense stuck in `PENDING_STAFF`/`PENDING_LEAD`
for >3 days) and `PROJECT_ENDING` (<=30 days to `endDate`). "Idempotent" means it will not
create a duplicate notification for the same user/project/type/message within a 3-day
window. Runs daily at 03:00 via `node-cron` (wired in `src/server.ts`), and can also be
triggered on demand: `POST /api/v1/notifications/generate` (ADMIN+).

## 7. Known limitation in the sandboxed dev environment this was built in

`npx prisma generate` / `migrate` / `validate` / `format` all require Prisma's CLI to
download its Rust schema-engine binary from `binaries.prisma.sh`. In the sandbox this was
built in, that host is blocked by the environment's egress policy (confirmed via
`curl https://binaries.prisma.sh` -> 403 on CONNECT), so **no Prisma CLI command could be
executed there**, on either Prisma 5.20 or 7.9.1. This is a network-policy restriction, not
a code issue - `npm install` (registry.npmjs.org) worked fine, and a local PostgreSQL 16
instance was available and running throughout. Run the commands in section 2/3 above in a
normal environment (or CI) with outbound internet access and they will work as documented.

## 8. Deviations from the schema/API contract

- `prisma/schema.prisma` models/fields were **not** renamed. `Approval.approverId` is
  `NOT NULL`, so approval rows are created at the moment someone acts (approve/reject),
  not as a pre-created "pending" placeholder; "who can act next" for a given expense is
  derived from `Expense.status` + the caller's `ProjectRole`, exposed via
  `GET /approvals/pending`. The `ApprovalStep.CLOSED` value is used for the final
  "mark as paid" action (`APPROVED -> PAID`), taken by project finance staff (`EDITOR+`).
- Everything else (routes, field names, response envelope, error codes) follows
  `docs/API_DESIGN.md` and `prisma/schema.prisma` as written.
