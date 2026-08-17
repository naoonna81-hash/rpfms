"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Pencil, Receipt, Wallet, TrendingDown, PiggyBank } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { projectsApi } from "@/lib/api/endpoints";
import { API_BASE_URL } from "@/lib/api/client";
import { formatCurrency, formatThaiDate } from "@/lib/utils";
import { BudgetCategoriesPanel } from "@/components/projects/budget-categories-panel";
import { IncomePanel } from "@/components/projects/income-panel";
import { MembersPanel } from "@/components/projects/members-panel";
import { WorkPackagesPanel } from "@/components/projects/work-packages-panel";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { useAuth } from "@/lib/auth/auth-context";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const projectId = params.id;

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId),
  });
  const summaryQuery = useQuery({
    queryKey: ["project-summary", projectId],
    queryFn: () => projectsApi.summary(projectId),
  });

  const canEdit = user && ["SUPER_ADMIN", "ADMIN"].includes(user.role) || projectQuery.data?.memberRole === "OWNER";

  if (projectQuery.isLoading) return <LoadingState />;
  if (projectQuery.isError || !projectQuery.data) return <ErrorState onRetry={() => projectQuery.refetch()} />;

  const project = projectQuery.data;
  const s = summaryQuery.data;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => router.push("/projects")}>
        <ArrowLeft className="h-4 w-4" /> กลับไปรายการโครงการ
      </Button>

      <PageHeader
        title={project.nameTh}
        description={`${project.code} · ปีงบประมาณ ${project.fiscalYear} · หัวหน้าโครงการ: ${project.principalInvestigator}`}
        actions={
          <>
            <ProjectStatusBadge status={project.status} />
            <a href={`${API_BASE_URL}${projectsApi.exportExcel(projectId)}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" /> Export Excel
              </Button>
            </a>
            {canEdit && (
              <Button size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> แก้ไขโครงการ
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summaryQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="งบประมาณรวม" value={formatCurrency(s?.totalBudget ?? project.totalBudget)} icon={Wallet} accent="blue" />
            <StatCard label="ใช้จ่ายแล้ว" value={formatCurrency(s?.totalSpent)} icon={TrendingDown} accent="gray" />
            <StatCard label="คงเหลือ" value={formatCurrency(s?.totalRemaining)} icon={PiggyBank} accent="green" />
            <StatCard label="จำนวนรายการเบิก" value={String(s?.expenseCount ?? 0)} icon={Receipt} accent="blue" />
          </>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        ระยะเวลาโครงการ: {formatThaiDate(project.startDate)} — {formatThaiDate(project.endDate)}
      </div>

      <Tabs defaultValue="budget-categories">
        <TabsList>
          <TabsTrigger value="budget-categories">หมวดงบประมาณ</TabsTrigger>
          <TabsTrigger value="work-packages">Work Package</TabsTrigger>
          <TabsTrigger value="income">รายรับ</TabsTrigger>
          <TabsTrigger value="expenses">รายจ่าย</TabsTrigger>
          <TabsTrigger value="members">สมาชิก</TabsTrigger>
        </TabsList>
        <TabsContent value="budget-categories">
          <BudgetCategoriesPanel projectId={projectId} />
        </TabsContent>
        <TabsContent value="work-packages">
          <WorkPackagesPanel projectId={projectId} />
        </TabsContent>
        <TabsContent value="income">
          <IncomePanel projectId={projectId} />
        </TabsContent>
        <TabsContent value="expenses">
          <div className="flex flex-col items-center gap-3 rounded-lg border py-10 text-center">
            <p className="text-sm text-muted-foreground">ดูและจัดการรายการเบิกจ่ายของโครงการนี้ในระบบเบิกจ่าย</p>
            <Link href={`/expenses?projectId=${projectId}`}>
              <Button>
                <Receipt className="h-4 w-4" /> ไปที่ระบบเบิกจ่าย
              </Button>
            </Link>
          </div>
        </TabsContent>
        <TabsContent value="members">
          <MembersPanel projectId={projectId} />
        </TabsContent>
      </Tabs>

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
    </div>
  );
}
