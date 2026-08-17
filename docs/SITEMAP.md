# Sitemap — RPFMS

```
/login                                     เข้าสู่ระบบ
/register                                  ลงทะเบียน (email + รหัสผ่าน)

/ (Dashboard)                              ภาพรวมงบประมาณทุกโครงการ + กราฟ

/projects                                  รายการโครงการวิจัยทั้งหมด (ค้นหา/กรอง/แบ่งหน้า)
/projects/[id]                             รายละเอียดโครงการ
   ├─ Tab: ภาพรวม                          สรุปงบ/สมาชิก/แหล่งทุน
   ├─ Tab: หมวดงบประมาณ                     CRUD BudgetCategory
   ├─ Tab: กิจกรรม (Work Packages)          CRUD WorkPackage
   ├─ Tab: รายรับ                          CRUD Income
   └─ Tab: สมาชิก/แชร์สิทธิ์                 เชิญผู้ใช้ + กำหนด role

/expenses                                  รายการเบิกจ่ายทุกโครงการ (กรอง/ค้นหา)
/expenses/new                              สร้างรายการเบิกใหม่ + แนบไฟล์ + OCR
/expenses/[id]                             รายละเอียดรายการเบิก + ประวัติอนุมัติ
/expenses/[id]/edit                        แก้ไข (เฉพาะ DRAFT/REJECTED)

/approvals                                 คิวรออนุมัติของผู้ใช้ปัจจุบัน

/reports                                   เลือกประเภทรายงาน + ตัวกรอง + Export PDF/Excel/CSV

/analytics                                 Burn rate, Budget utilization, Top categories (เลือกโครงการ)

/search                                    ค้นหาข้ามโครงการ/รายการเบิก

/notifications                             รายการแจ้งเตือนทั้งหมด (+ กระดิ่งใน Top Nav ทุกหน้า)

/settings                                  โปรไฟล์ / เปลี่ยนรหัสผ่าน
   └─ (ADMIN/SUPER_ADMIN) จัดการผู้ใช้งานระบบ
```

## Global chrome (ทุกหน้าหลังล็อกอิน)
- **Sidebar** ซ้าย: แดชบอร์ด, โครงการวิจัย, ระบบเบิกจ่าย, ระบบอนุมัติ, วิเคราะห์งบประมาณ, รายงาน, ค้นหา, แจ้งเตือน, ตั้งค่า
- **Top navigation**: ช่องค้นหาด่วน, ปุ่มสลับ Dark/Light, กระดิ่งแจ้งเตือน (พร้อม badge), เมนูผู้ใช้ (โปรไฟล์/ออกจากระบบ)
- Mobile (<768px): Sidebar พับเป็น Drawer + Bottom navigation bar 5 เมนูหลัก (ดูภาพหน้าจอ `screenshots/mobile_dashboard.png`)
