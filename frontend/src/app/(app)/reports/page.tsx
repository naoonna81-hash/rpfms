"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2, Table2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ProjectSelect } from "@/components/shared/project-select";
import { apiDownload, ApiClientError } from "@/lib/api/client";
import { reportDownloadPath, type ReportFormat, type ReportType } from "@/lib/api/endpoints";
import { thaiFiscalYear } from "@/lib/utils";

const reportTypes: { value: ReportType; label: string; needsProject?: boolean; needsYear?: boolean }[] = [
  { value: "income", label: "รายงานรายรับ", needsProject: true },
  { value: "expense", label: "รายงานรายจ่าย", needsProject: true },
  { value: "remaining-budget", label: "รายงานงบคงเหลือ", needsProject: true },
  { value: "by-project", label: "รายงานแยกตามโครงการ" },
  { value: "by-category", label: "รายงานแยกตามหมวดงบประมาณ", needsProject: true },
  { value: "monthly", label: "รายงานรายเดือน", needsYear: true },
  { value: "annual", label: "รายงานรายปี", needsYear: true },
];

const formats: { value: ReportFormat; label: string; icon: typeof FileText }[] = [
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "excel", label: "Excel", icon: FileSpreadsheet },
  { value: "csv", label: "CSV", icon: Table2 },
];

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("expense");
  const [projectId, setProjectId] = useState<string>("");
  const [year, setYear] = useState<string>(String(thaiFiscalYear() - 543));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [downloading, setDownloading] = useState<ReportFormat | null>(null);

  const config = reportTypes.find((r) => r.value === type)!;

  const handleExport = async (format: ReportFormat) => {
    setDownloading(format);
    try {
      const path = reportDownloadPath(type, format, {
        projectId: config.needsProject ? projectId || undefined : undefined,
        year: config.needsYear ? year : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      const ext = format === "excel" ? "xlsx" : format;
      await apiDownload(path, `rpfms-${type}-report.${ext}`);
      toast.success("ดาวน์โหลดรายงานสำเร็จ");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "ไม่สามารถดาวน์โหลดรายงานได้");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="รายงาน" description="เลือกประเภทรายงานและตัวกรอง จากนั้นส่งออกเป็น PDF, Excel หรือ CSV" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>ประเภทรายงาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {reportTypes.map((rt) => (
              <button
                key={rt.value}
                onClick={() => setType(rt.value)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  type === rt.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {rt.label}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{config.label}</CardTitle>
            <CardDescription>กำหนดตัวกรองสำหรับรายงาน แล้วเลือกรูปแบบไฟล์ที่ต้องการส่งออก</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {config.needsProject && (
                <div className="space-y-1.5">
                  <Label>โครงการ</Label>
                  <ProjectSelect includeAll value={projectId || "all"} onChange={(v) => setProjectId(v === "all" ? "" : v)} />
                </div>
              )}
              {config.needsYear && (
                <div className="space-y-1.5">
                  <Label>ปีงบประมาณ (ค.ศ.)</Label>
                  <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>ตั้งแต่วันที่</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ถึงวันที่</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              {formats.map((f) => (
                <Button key={f.value} variant="outline" onClick={() => handleExport(f.value)} disabled={!!downloading}>
                  {downloading === f.value ? <Loader2 className="h-4 w-4 animate-spin" /> : <f.icon className="h-4 w-4" />}
                  ส่งออก {f.label}
                  <Download className="h-3.5 w-3.5 opacity-60" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
