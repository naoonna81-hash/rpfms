import { Stethoscope } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
          <Stethoscope className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold">RPFMS</h1>
        <p className="max-w-xs text-xs text-muted-foreground">
          ระบบบริหารบัญชีโครงการวิจัย ศูนย์เชี่ยวชาญเฉพาะทางด้านโรคตับอักเสบและมะเร็งตับ
          คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย
        </p>
      </div>
      {children}
    </div>
  );
}
