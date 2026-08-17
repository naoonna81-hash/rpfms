import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  ClipboardCheck,
  FileBarChart,
  Search,
  Bell,
  Settings,
  LineChart,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export const navItems: NavItem[] = [
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/projects", label: "โครงการวิจัย", icon: FolderKanban },
  { href: "/expenses", label: "ระบบเบิกจ่าย", icon: Receipt },
  { href: "/approvals", label: "ระบบอนุมัติ", icon: ClipboardCheck },
  { href: "/analytics", label: "วิเคราะห์งบประมาณ", icon: LineChart },
  { href: "/reports", label: "รายงาน", icon: FileBarChart },
  { href: "/search", label: "ค้นหา", icon: Search },
  { href: "/notifications", label: "แจ้งเตือน", icon: Bell },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

// รายการหลักสำหรับ bottom nav บนมือถือ (เลือกเฉพาะเมนูที่ใช้บ่อย)
export const mobileNavItems: NavItem[] = [
  navItems[0],
  navItems[1],
  navItems[2],
  navItems[3],
  navItems[7], // notifications... replaced below by settings for common flows
];
