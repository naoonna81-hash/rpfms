"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Search, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { ExpenseStatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectSelect } from "@/components/shared/project-select";
import { CategorySelect } from "@/components/shared/category-select";
import { expensesApi, type ExpenseFilters } from "@/lib/api/endpoints";
import { debounce, formatCurrency, formatThaiDate } from "@/lib/utils";
import type { Expense, ExpenseStatus } from "@/types";

function ExpensesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [projectId, setProjectId] = useState(searchParams.get("projectId") ?? "all");
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("-date");

  const filters: ExpenseFilters = {
    q: q || undefined,
    projectId: projectId === "all" ? undefined : projectId,
    categoryId: categoryId === "all" ? undefined : categoryId,
    status: status === "all" ? undefined : (status as ExpenseStatus),
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 10,
    sort,
  };

  const query = useQuery({
    queryKey: ["expenses", filters],
    queryFn: () => expensesApi.list(filters),
  });

  const debouncedSetQ = useMemo(() => debounce((v: string) => { setQ(v); setPage(1); }, 350), []);

  const hasFilters = projectId !== "all" || categoryId !== "all" || status !== "all" || dateFrom || dateTo || q;
  const clearFilters = () => {
    setQ(""); setProjectId("all"); setCategoryId("all"); setStatus("all"); setDateFrom(""); setDateTo(""); setPage(1);
  };

  const columns: ColumnDef<Expense>[] = [
    { accessorKey: "date", header: "วันที่", meta: { sortKey: "date" }, cell: ({ row }) => formatThaiDate(row.original.date) },
    { accessorKey: "documentNo", header: "เลขที่เอกสาร" },
    {
      accessorKey: "description",
      header: "รายการ",
      cell: ({ row }) => <span className="max-w-[220px] truncate block font-medium">{row.original.description}</span>,
    },
    { accessorKey: "payee", header: "ผู้รับเงิน" },
    {
      accessorKey: "amount",
      header: "จำนวนเงิน",
      meta: { sortKey: "amount" },
      cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.amount)}</span>,
    },
    { accessorKey: "status", header: "สถานะ", cell: ({ row }) => <ExpenseStatusBadge status={row.original.status} /> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="ระบบเบิกจ่าย"
        description="จัดการรายการเบิกจ่ายของทุกโครงการ"
        actions={
          <Link href="/expenses/new">
            <Button>
              <Plus className="h-4 w-4" /> สร้างรายการเบิก
            </Button>
          </Link>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="ค้นหารายการ, เลขที่เอกสาร..." className="pl-8" defaultValue={q} onChange={(e) => debouncedSetQ(e.target.value)} />
        </div>
        <ProjectSelect includeAll value={projectId} onChange={(v) => { setProjectId(v); setCategoryId("all"); setPage(1); }} />
        <CategorySelect
          includeAll
          projectId={projectId === "all" ? undefined : projectId}
          value={categoryId}
          onChange={(v) => { setCategoryId(v); setPage(1); }}
        />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger>
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="DRAFT">แบบร่าง</SelectItem>
            <SelectItem value="PENDING_STAFF">รออนุมัติ (เจ้าหน้าที่)</SelectItem>
            <SelectItem value="PENDING_LEAD">รออนุมัติ (หัวหน้าโครงการ)</SelectItem>
            <SelectItem value="APPROVED">อนุมัติ</SelectItem>
            <SelectItem value="PAID">จ่ายแล้ว</SelectItem>
            <SelectItem value="REJECTED">ไม่อนุมัติ</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground">ตั้งแต่วันที่</label>
        <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-auto" />
        <label className="text-xs text-muted-foreground">ถึงวันที่</label>
        <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-auto" />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> ล้างตัวกรอง
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        emptyTitle="ไม่พบรายการเบิกจ่าย"
        page={page}
        totalPages={Math.max(1, Math.ceil((query.data?.meta.total ?? 0) / (query.data?.meta.limit ?? 10)))}
        total={query.data?.meta.total}
        onPageChange={setPage}
        sort={sort}
        onSortChange={setSort}
        onRowClick={(row) => router.push(`/expenses/${row.id}`)}
      />
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <ExpensesContent />
    </Suspense>
  );
}
