# API Design — RPFMS

Base URL: `/api/v1`
Auth: JWT Bearer (access token 15 min + refresh token 7 วัน, httpOnly cookie สำหรับ refresh)
Content-Type: `application/json` (ยกเว้น upload ใช้ `multipart/form-data`)

ทุก endpoint ที่เขียนข้อมูล (POST/PUT/PATCH/DELETE) ต้องมี AuditLog entry อัตโนมัติผ่าน middleware

## Response envelope
```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 20, "total": 100 } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

## 1. Auth `/auth`
| Method | Path | คำอธิบาย | สิทธิ์ |
|---|---|---|---|
| POST | /auth/register | ลงทะเบียนด้วย email+password | public |
| POST | /auth/login | เข้าสู่ระบบ, คืน access+refresh token | public |
| POST | /auth/refresh | ขอ access token ใหม่จาก refresh token | public (cookie) |
| POST | /auth/logout | ล้าง refresh token | authenticated |
| GET  | /auth/me | ข้อมูลผู้ใช้ปัจจุบัน | authenticated |
| PATCH| /auth/me | แก้ไขโปรไฟล์/เปลี่ยนรหัสผ่าน | authenticated |

## 2. Users `/users` (SUPER_ADMIN, ADMIN)
| Method | Path | คำอธิบาย |
|---|---|---|
| GET | /users | รายชื่อผู้ใช้ทั้งหมด (search, pagination) |
| GET | /users/:id | รายละเอียดผู้ใช้ |
| PATCH | /users/:id | แก้ไข role / isActive |
| DELETE | /users/:id | ปิดการใช้งาน (soft) |

## 3. Projects `/projects`
| Method | Path | คำอธิบาย | สิทธิ์ |
|---|---|---|---|
| GET | /projects | รายการโครงการ (filter: fiscalYear, status, q) | ตาม ProjectMember/role |
| POST | /projects | สร้างโครงการใหม่ | ADMIN+ |
| GET | /projects/:id | รายละเอียดโครงการ + สรุปงบ | member |
| PUT | /projects/:id | แก้ไขโครงการ | OWNER/ADMIN |
| DELETE | /projects/:id | ลบโครงการ | ADMIN+ |
| GET | /projects/:id/summary | งบรวม/ใช้แล้ว/คงเหลือ/burn rate | member |
| POST | /projects/:id/members | เชิญ/แชร์สิทธิ์ผู้ใช้ (email + role) | OWNER/ADMIN |
| PATCH | /projects/:id/members/:userId | แก้ role สมาชิก | OWNER/ADMIN |
| DELETE | /projects/:id/members/:userId | ถอดสิทธิ์ | OWNER/ADMIN |
| POST | /projects/:id/fundings | เพิ่มแหล่งทุน | OWNER/ADMIN |
| GET/POST | /projects/:id/work-packages | จัดการ Work Package | member/editor |

## 4. Budget Categories `/projects/:projectId/budget-categories`
| Method | Path | คำอธิบาย |
|---|---|---|
| GET | / | รายการหมวดงบของโครงการ |
| POST | / | สร้างหมวดใหม่ (name, allocatedAmount) |
| PUT | /:id | แก้ไขหมวด |
| DELETE | /:id | ลบหมวด (ถ้าไม่มีรายการผูกอยู่) |

## 5. Expenses (ระบบเบิกจ่าย) `/expenses`
| Method | Path | คำอธิบาย |
|---|---|---|
| GET | /expenses | รายการเบิกจ่าย (filter: projectId, categoryId, status, dateFrom/To, q) |
| POST | /expenses | สร้างรายการเบิก (draft) |
| GET | /expenses/:id | รายละเอียด + ไฟล์แนบ + ประวัติอนุมัติ |
| PUT | /expenses/:id | แก้ไข (เฉพาะ DRAFT/REJECTED) |
| DELETE | /expenses/:id | ลบ (เฉพาะ DRAFT) |
| POST | /expenses/:id/submit | ส่งเข้า workflow อนุมัติ (PENDING_STAFF) |
| POST | /expenses/:id/files | อัปโหลดไฟล์ PDF/JPG แนบ |
| POST | /expenses/:id/files/:fileId/ocr | รัน OCR + heuristic extraction คืนค่า {date, amount, documentNo} |
| DELETE | /expenses/:id/files/:fileId | ลบไฟล์แนบ |

### OCR/IDP pipeline
1. อัปโหลดไฟล์ → เก็บใน storage (local `/uploads` หรือ S3-compatible ถ้ามี env กำหนด)
2. `tesseract.js` (lang: `tha+eng`) แปลงภาพ/PDF (แปลง PDF หน้าแรกเป็นภาพก่อนด้วย `pdf-img-convert`) เป็นข้อความ
3. Heuristic extraction (regex) ดึง: วันที่ (พ.ศ./ค.ศ. หลายรูปแบบ), จำนวนเงิน (รูปแบบ 1,234.00 / บาท), เลขที่เอกสาร (เลขนำหน้า INV/RC/เลขที่)
4. คืนค่า `ocrExtractedData` พร้อม `confidence` ต่อ field ให้ผู้ใช้ตรวจสอบ/แก้ไขก่อนบันทึกจริง (human-in-the-loop เสมอ)
5. Service แยกเป็น `services/ocr.service.ts` —ออกแบบ interface ให้เรียกใช้ LLM (เช่น Claude API) แทน/เสริม heuristic ได้ในอนาคตโดยไม่ต้องแก้ endpoint

## 6. Approvals `/expenses/:expenseId/approvals`
| Method | Path | คำอธิบาย |
|---|---|---|
| GET | / | ประวัติ/สถานะอนุมัติของรายการ |
| POST | /approve | อนุมัติขั้นปัจจุบัน (เจ้าหน้าที่ → หัวหน้าโครงการ → ปิดรายการ) พร้อม comment |
| POST | /reject | ตีกลับพร้อม comment (สถานะ REJECTED) |
| GET | /pending | (`/approvals/pending`) รายการรออนุมัติของผู้ใช้ปัจจุบัน |

Workflow state machine: `DRAFT → PENDING_STAFF → PENDING_LEAD → APPROVED → PAID` (หรือ `REJECTED` ได้ทุกขั้นก่อน PAID)

## 7. Income `/projects/:projectId/incomes`
CRUD มาตรฐาน: GET(list), POST, GET/:id, PUT/:id, DELETE/:id — fields: installment, receivedDate, amount, documentNo, notes, fundingSourceId

## 8. Dashboard & Analytics `/dashboard`, `/analytics`
| Method | Path | คำอธิบาย |
|---|---|---|
| GET | /dashboard/summary | จำนวนโครงการ, งบรวม, ใช้แล้ว, คงเหลือ, จำนวนรายการเบิก |
| GET | /dashboard/monthly | ยอดใช้จ่ายรายเดือน (สำหรับกราฟเส้น/แท่ง) |
| GET | /dashboard/by-category | งบตามหมวดหมู่ (สำหรับ Pie/Bar) |
| GET | /dashboard/by-project | งบตามโครงการ |
| GET | /analytics/burn-rate?projectId= | Burn rate รายเดือน vs แผน |
| GET | /analytics/budget-utilization?projectId= | % การใช้งบ |
| GET | /analytics/top-categories?projectId= | หมวดที่ใช้จ่ายสูงสุด |

## 9. Reports `/reports`
| Method | Path | คำอธิบาย |
|---|---|---|
| GET | /reports/income?projectId=&format=pdf\|excel\|csv | รายงานรายรับ |
| GET | /reports/expense?...&format= | รายงานรายจ่าย |
| GET | /reports/remaining-budget?... | รายงานงบคงเหลือ |
| GET | /reports/by-project?... | แยกตามโครงการ |
| GET | /reports/by-category?... | แยกตามหมวด |
| GET | /reports/monthly?year=&format= | รายงานรายเดือน |
| GET | /reports/annual?year=&format= | รายงานรายปี |

Export ใช้ `exceljs` (Excel), `pdfkit` (PDF), CSV เขียนเอง (streaming)

## 10. Search `/search`
`GET /search?q=&type=project|expense|all&projectId=&categoryId=&fiscalYear=&dateFrom=&dateTo=`

## 11. Notifications `/notifications`
GET (list, unread count), PATCH `/:id/read`, PATCH `/read-all`
สร้างอัตโนมัติผ่าน cron/worker: BUDGET_LOW (>80% ใช้ไป), BUDGET_OVER, PENDING_APPROVAL (ค้าง >3 วัน), PROJECT_ENDING (<=30 วันก่อนสิ้นสุด)

## 12. Import/Export
| Method | Path | คำอธิบาย |
|---|---|---|
| POST | /projects/:id/import/excel | นำเข้ารายการงบ/เบิกจ่ายจาก Excel template |
| GET | /projects/:id/export/excel | Export ข้อมูลโครงการทั้งหมดเป็น Excel |

## 13. Audit Logs `/audit-logs` (ADMIN+)
`GET /audit-logs?entityType=&entityId=&userId=&dateFrom=&dateTo=`

## Error codes
`VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, INTERNAL_ERROR`

## Pagination
Query: `page` (default 1), `limit` (default 20, max 100), `sort` (e.g. `-createdAt`)
