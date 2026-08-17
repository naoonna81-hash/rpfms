import type { Metadata, Viewport } from "next";
// ฟอนต์ Kanit โฮสต์เองผ่าน @fontsource (แทน next/font/google) เพราะสภาพแวดล้อม build
// บางแห่งไม่มีเครือข่ายออกไปยัง Google Fonts ได้ — ไฟล์ฟอนต์จึงถูก bundle เข้ากับแอปโดยตรง
import "@fontsource/kanit/300.css";
import "@fontsource/kanit/400.css";
import "@fontsource/kanit/500.css";
import "@fontsource/kanit/600.css";
import "@fontsource/kanit/700.css";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "RPFMS - ระบบบริหารงบประมาณโครงการวิจัย",
  description: "ระบบบริหารบัญชีโครงการวิจัย ศูนย์เชี่ยวชาญเฉพาะทางด้านโรคตับอักเสบและมะเร็งตับ คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2a78d6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
