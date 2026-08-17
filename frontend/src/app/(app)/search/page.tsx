"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExpenseStatusBadge, ProjectStatusBadge } from "@/components/shared/status-badge";
import { searchApi } from "@/lib/api/endpoints";
import { formatCurrency, formatThaiDate } from "@/lib/utils";

function SearchContent() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [type, setType] = useState<"all" | "project" | "expense">("all");
  const [submittedQ, setSubmittedQ] = useState(searchParams.get("q") ?? "");

  const query = useQuery({
    queryKey: ["search", submittedQ, type],
    queryFn: () => searchApi.search({ q: submittedQ, type }),
    enabled: submittedQ.length > 0,
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQ(q);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="ค้นหา" description="ค้นหาโครงการ, รายการเบิกจ่าย, นักวิจัย, หมวดงบประมาณ, ปีงบประมาณ" />

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์คำค้นหา..." className="pl-8" />
        </div>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="project">โครงการ</SelectItem>
            <SelectItem value="expense">รายการเบิกจ่าย</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">ค้นหา</Button>
      </form>

      {!submittedQ ? (
        <EmptyState title="พิมพ์คำค้นหาเพื่อเริ่มต้น" description="ค้นหาได้จากชื่อโครงการ รหัสโครงการ นักวิจัย หรือรายการเบิกจ่าย" />
      ) : query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : (
        <div className="space-y-6">
          {(!query.data || (query.data.projects.length === 0 && query.data.expenses.length === 0)) && (
            <EmptyState title={`ไม่พบผลลัพธ์สำหรับ "${submittedQ}"`} />
          )}

          {query.data && query.data.projects.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">โครงการ ({query.data.projects.length})</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {query.data.projects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <Card className="transition-colors hover:bg-muted/40">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm">{p.nameTh}</CardTitle>
                          <ProjectStatusBadge status={p.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 text-xs text-muted-foreground">
                        {p.code} · {p.principalInvestigator} · งบ {formatCurrency(p.totalBudget)} บาท
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {query.data && query.data.expenses.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">รายการเบิกจ่าย ({query.data.expenses.length})</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {query.data.expenses.map((e) => (
                  <Link key={e.id} href={`/expenses/${e.id}`}>
                    <Card className="transition-colors hover:bg-muted/40">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm truncate">{e.description}</CardTitle>
                          <ExpenseStatusBadge status={e.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 text-xs text-muted-foreground">
                        {e.documentNo} · {formatThaiDate(e.date)} · {formatCurrency(e.amount)} บาท
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}
