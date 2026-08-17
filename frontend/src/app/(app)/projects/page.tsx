"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectsApi } from "@/lib/api/endpoints";
import { debounce, formatCurrency } from "@/lib/utils";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { useAuth } from "@/lib/auth/auth-context";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("-createdAt");
  const [formOpen, setFormOpen] = useState(false);

  const canCreate = user && ["SUPER_ADMIN", "ADMIN"].includes(user.role);

  const query = useQuery({
    queryKey: ["projects", { q, status, page, sort }],
    queryFn: () =>
      projectsApi.list({
        q: q || undefined,
        status: status === "all" ? undefined : status,
        page,
        limit: 10,
        sort,
      }),
  });

  const debouncedSetQ = useMemo(() => debounce((v: string) => { setQ(v); setPage(1); }, 350), []);

  const columns: ColumnDef<Project>[] = [
    { accessorKey: "code", header: "รหัส", meta: { sortKey: "code" } },
    {
      accessorKey: "nameTh",
      header: "ชื่อโครงการ",
      cell: ({ row }) => <span className="font-medium">{row.original.nameTh}</span>,
    },
    { accessorKey: "principalInvestigator", header: "หัวหน้าโครงการ" },
    { accessorKey: "fiscalYear", header: "ปีงบประมาณ", cell: ({ row }) => row.original.fiscalYear },
    {
      accessorKey: "totalBudget",
      header: "งบประมาณรวม",
      meta: { sortKey: "totalBudget" },
      cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.totalBudget)}</span>,
    },
    {
      accessorKey: "status",
      header: "สถานะ",
      cell: ({ row }) => <ProjectStatusBadge status={row.original.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="โครงการวิจัย"
        description="รายการโครงการวิจัยทั้งหมดที่บริหารจัดการงบประมาณผ่านระบบ"
        actions={
          canCreate && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> สร้างโครงการใหม่
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อโครงการ, รหัส, หัวหน้าโครงการ..."
            className="pl-8"
            onChange={(e) => debouncedSetQ(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="ACTIVE">ดำเนินการอยู่</SelectItem>
            <SelectItem value="COMPLETED">เสร็จสิ้น</SelectItem>
            <SelectItem value="SUSPENDED">ระงับชั่วคราว</SelectItem>
            <SelectItem value="CLOSED">ปิดโครงการ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        emptyTitle="ยังไม่มีโครงการวิจัย"
        emptyDescription="เริ่มต้นสร้างโครงการวิจัยแรกของคุณ"
        page={page}
        totalPages={Math.max(1, Math.ceil((query.data?.meta.total ?? 0) / (query.data?.meta.limit ?? 10)))}
        total={query.data?.meta.total}
        onPageChange={setPage}
        sort={sort}
        onSortChange={setSort}
        onRowClick={(row) => router.push(`/projects/${row.id}`)}
      />

      <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
