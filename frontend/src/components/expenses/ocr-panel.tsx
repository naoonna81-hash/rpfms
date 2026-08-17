"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, ScanText, Sparkles, UploadCloud, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { expensesApi } from "@/lib/api/endpoints";
import { ApiClientError } from "@/lib/api/client";
import { formatCurrency, formatThaiDate } from "@/lib/utils";
import type { OcrResult } from "@/types";

function confidenceBadge(confidence?: number) {
  if (confidence === undefined) return <Badge variant="gray">ไม่ทราบความมั่นใจ</Badge>;
  if (confidence >= 0.8) return <Badge variant="success">ความมั่นใจสูง {(confidence * 100).toFixed(0)}%</Badge>;
  if (confidence >= 0.5) return <Badge variant="warning">ความมั่นใจปานกลาง {(confidence * 100).toFixed(0)}%</Badge>;
  return <Badge variant="destructive">ความมั่นใจต่ำ {(confidence * 100).toFixed(0)}%</Badge>;
}

interface OcrPanelProps {
  /** จะเรียกเมื่อยังไม่มี expense id เพื่อบันทึกแบบร่างก่อนแนบไฟล์ */
  ensureExpenseId: () => Promise<string | null>;
  onAccept: (field: "date" | "amount" | "documentNo", value: string | number) => void;
}

export function OcrPanel({ ensureExpenseId, onAccept }: OcrPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "scanning" | "done" | "error">("idle");
  const [result, setResult] = useState<OcrResult | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    setAccepted({});
    if (file.type.startsWith("image/")) setPreviewUrl(URL.createObjectURL(file));
    else setPreviewUrl(null);

    setStatus("uploading");
    try {
      const expenseId = await ensureExpenseId();
      if (!expenseId) {
        toast.error("กรุณากรอกโครงการและหมวดงบประมาณก่อนแนบไฟล์");
        setStatus("idle");
        return;
      }
      const uploaded = await expensesApi.uploadFile(expenseId, file);
      setStatus("scanning");
      const ocr = await expensesApi.runOcr(expenseId, uploaded.id);
      setResult(ocr);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      toast.error(e instanceof ApiClientError ? e.message : "ไม่สามารถประมวลผล OCR ได้");
    }
  };

  const accept = (field: "date" | "amount" | "documentNo") => {
    if (!result?.[field]) return;
    onAccept(field, result[field]!.value as never);
    setAccepted((a) => ({ ...a, [field]: true }));
    toast.success("นำค่าที่ตรวจพบไปกรอกในฟอร์มแล้ว กรุณาตรวจสอบความถูกต้องอีกครั้ง");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanText className="h-4 w-4 text-primary" /> ผู้ช่วยอ่านใบเสร็จ (OCR)
        </CardTitle>
        <CardDescription>
          อัปโหลดไฟล์ใบเสร็จ/ใบกำกับภาษี (PDF, JPG) ระบบจะช่วยดึงข้อมูลเบื้องต้นให้ — <b>เป็นเพียงตัวช่วย</b>
          กรุณาตรวจสอบและยืนยันความถูกต้องก่อนนำไปใช้เสมอ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/30 px-4 py-8 text-center hover:bg-muted/50 transition-colors"
        >
          <UploadCloud className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">{fileName ?? "คลิกเพื่อเลือกไฟล์ หรือวางไฟล์ที่นี่"}</p>
          <p className="text-xs text-muted-foreground">รองรับ PDF, JPG, PNG ขนาดไม่เกิน 10MB</p>
        </button>

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="ตัวอย่างไฟล์แนบ" className="max-h-48 w-full rounded-md border object-contain" />
        )}

        {status === "uploading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังอัปโหลดไฟล์...
          </div>
        )}
        {status === "scanning" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังอ่านข้อมูลด้วย OCR (tesseract.js)...
          </div>
        )}

        {status === "done" && result && (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> ผลลัพธ์ที่ตรวจพบ — กรุณายืนยันก่อนใช้งาน
            </div>
            <OcrFieldRow
              label="วันที่เอกสาร"
              display={result.date ? formatThaiDate(result.date.value) : "-"}
              confidence={result.date?.confidence}
              disabled={!result.date}
              acceptedFlag={accepted.date}
              onAccept={() => accept("date")}
            />
            <OcrFieldRow
              label="จำนวนเงิน"
              display={result.amount ? formatCurrency(result.amount.value, { withSymbol: true }) : "-"}
              confidence={result.amount?.confidence}
              disabled={!result.amount}
              acceptedFlag={accepted.amount}
              onAccept={() => accept("amount")}
            />
            <OcrFieldRow
              label="เลขที่เอกสาร"
              display={result.documentNo?.value ?? "-"}
              confidence={result.documentNo?.confidence}
              disabled={!result.documentNo}
              acceptedFlag={accepted.documentNo}
              onAccept={() => accept("documentNo")}
            />
            <Alert className="border-primary/30 bg-primary/5">
              <AlertDescription className="text-xs">
                ผลลัพธ์นี้มาจากการประมวลผลอัตโนมัติ อาจมีความคลาดเคลื่อน โปรดตรวจสอบตัวเลขและวันที่กับเอกสารต้นฉบับก่อนกดยืนยัน
              </AlertDescription>
            </Alert>
          </div>
        )}

        {status === "error" && <p className="text-sm text-destructive">เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง</p>}
      </CardContent>
    </Card>
  );
}

function OcrFieldRow({
  label,
  display,
  confidence,
  disabled,
  acceptedFlag,
  onAccept,
}: {
  label: string;
  display: string;
  confidence?: number;
  disabled?: boolean;
  acceptedFlag?: boolean;
  onAccept: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-background p-2 text-sm">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{display}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {confidenceBadge(confidence)}
        <Button type="button" size="sm" variant={acceptedFlag ? "secondary" : "outline"} disabled={disabled} onClick={onAccept}>
          {acceptedFlag ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {acceptedFlag ? "ใช้ค่านี้แล้ว" : "ใช้ค่านี้"}
        </Button>
      </div>
    </div>
  );
}
