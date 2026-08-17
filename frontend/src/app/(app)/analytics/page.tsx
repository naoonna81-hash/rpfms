"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gauge, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { ProjectSelect } from "@/components/shared/project-select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/states";
import { analyticsApi, dashboardApi, projectsApi } from "@/lib/api/endpoints";
import { formatCurrency } from "@/lib/utils";
import { MonthlySpendChart } from "@/components/dashboard/monthly-spend-chart";
import { BurnRateChart } from "@/components/analytics/burn-rate-chart";
import { TopCategoriesChart } from "@/components/analytics/top-categories-chart";

export default function AnalyticsPage() {
  const [projectId, setProjectId] = useState<string>("");

  const projectsQuery = useQuery({
    queryKey: ["projects", "select-all"],
    queryFn: () => projectsApi.list({ limit: 100, sort: "code" }),
  });

  useEffect(() => {
    if (!projectId && projectsQuery.data && projectsQuery.data.items.length > 0) {
      setProjectId(projectsQuery.data.items[0].id);
    }
  }, [projectId, projectsQuery.data]);

  const utilizationQuery = useQuery({
    queryKey: ["analytics-utilization", projectId],
    queryFn: () => analyticsApi.budgetUtilization(projectId),
    enabled: !!projectId,
  });
  const burnRateQuery = useQuery({
    queryKey: ["analytics-burn-rate", projectId],
    queryFn: () => analyticsApi.burnRate(projectId),
    enabled: !!projectId,
  });
  const topCategoriesQuery = useQuery({
    queryKey: ["analytics-top-categories", projectId],
    queryFn: () => analyticsApi.topCategories(projectId),
    enabled: !!projectId,
  });
  const monthlyQuery = useQuery({
    queryKey: ["dashboard-monthly-project", projectId],
    queryFn: () => dashboardApi.monthly({ projectId }),
    enabled: !!projectId,
  });

  const u = utilizationQuery.data;
  const pct = u ? Math.round(u.utilizationPercent) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="วิเคราะห์งบประมาณ"
        description="Burn rate, การใช้งบประมาณ และแนวโน้มรายจ่ายรายโครงการ"
        actions={<ProjectSelect value={projectId} onChange={setProjectId} className="w-64" />}
      />

      {!projectId ? (
        <EmptyState title="เลือกโครงการเพื่อดูข้อมูลวิเคราะห์" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {utilizationQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard label="งบประมาณรวม" value={formatCurrency(u?.totalBudget)} icon={Wallet} accent="blue" />
                <StatCard label="ใช้จ่ายแล้ว" value={formatCurrency(u?.totalSpent)} icon={TrendingUp} accent="gray" />
                <StatCard
                  label="งบคงเหลือ"
                  value={formatCurrency((u?.totalBudget ?? 0) - (u?.totalSpent ?? 0))}
                  icon={PiggyBank}
                  accent="green"
                />
                <StatCard label="% การใช้งบ" value={`${pct}%`} icon={Gauge} accent={pct >= 90 ? "red" : pct >= 70 ? "gray" : "blue"} />
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>สัดส่วนการใช้งบประมาณ</CardTitle>
              <CardDescription>เปอร์เซ็นต์การใช้งบประมาณเทียบกับงบที่ได้รับทั้งหมด</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={Math.min(100, pct)} className="h-3 flex-1" indicatorClassName={pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary"} />
                <span className="w-14 text-right text-lg font-semibold tabular-nums">{pct}%</span>
              </div>
              {pct >= 80 && (
                <p className={`mt-2 text-xs ${pct >= 100 ? "text-destructive" : "text-warning-foreground"}`}>
                  {pct >= 100 ? "ใช้งบประมาณเกินกำหนดแล้ว" : "ใช้งบประมาณใกล้ครบตามที่จัดสรรแล้ว โปรดวางแผนการใช้จ่ายที่เหลือ"}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <MonthlySpendChart data={monthlyQuery.data} isLoading={monthlyQuery.isLoading} />
            <BurnRateChart data={burnRateQuery.data} isLoading={burnRateQuery.isLoading} />
          </div>
          <TopCategoriesChart data={topCategoriesQuery.data} isLoading={topCategoriesQuery.isLoading} />
        </>
      )}
    </div>
  );
}
