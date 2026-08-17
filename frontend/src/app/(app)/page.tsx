"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Wallet, TrendingDown, PiggyBank, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { ErrorState } from "@/components/shared/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dashboardApi } from "@/lib/api/endpoints";
import { formatCurrency, formatNumber, thaiFiscalYear } from "@/lib/utils";
import { MonthlySpendChart } from "@/components/dashboard/monthly-spend-chart";
import { CategoryBudgetChart } from "@/components/dashboard/category-budget-chart";
import { ProjectBudgetChart } from "@/components/dashboard/project-budget-chart";
import { ExpensePieChart } from "@/components/dashboard/expense-pie-chart";

const currentBEYear = thaiFiscalYear();
const fiscalYearOptions = Array.from({ length: 5 }, (_, i) => currentBEYear - i);

export default function DashboardPage() {
  const [fiscalYear, setFiscalYear] = useState<string>(String(currentBEYear));
  const fy = Number(fiscalYear); // fiscalYear ถูกเก็บและส่งเป็นปี พ.ศ. ตรง ๆ ทั้งระบบ (ไม่ต้องแปลง)

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary", fy],
    queryFn: () => dashboardApi.summary({ fiscalYear: fy }),
  });
  const monthlyQuery = useQuery({
    queryKey: ["dashboard-monthly", fy],
    queryFn: () => dashboardApi.monthly({ fiscalYear: fy }),
  });
  const byCategoryQuery = useQuery({
    queryKey: ["dashboard-by-category", fy],
    queryFn: () => dashboardApi.byCategory({ fiscalYear: fy }),
  });
  const byProjectQuery = useQuery({
    queryKey: ["dashboard-by-project", fy],
    queryFn: () => dashboardApi.byProject({ fiscalYear: fy }),
  });

  const s = summaryQuery.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="แดชบอร์ด"
        description="ภาพรวมงบประมาณโครงการวิจัยทั้งหมด"
        actions={
          <Select value={fiscalYear} onValueChange={setFiscalYear}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="ปีงบประมาณ" />
            </SelectTrigger>
            <SelectContent>
              {fiscalYearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  ปีงบประมาณ {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {summaryQuery.isError ? (
        <ErrorState onRetry={() => summaryQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {summaryQuery.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard label="จำนวนโครงการทั้งหมด" value={formatNumber(s?.totalProjects)} icon={FolderKanban} accent="blue" />
              <StatCard label="งบประมาณรวม" value={formatCurrency(s?.totalBudget)} hint="บาท" icon={Wallet} accent="blue" />
              <StatCard label="งบที่ใช้แล้ว" value={formatCurrency(s?.totalSpent)} hint="บาท" icon={TrendingDown} accent="gray" />
              <StatCard label="งบคงเหลือ" value={formatCurrency(s?.totalRemaining)} hint="บาท" icon={PiggyBank} accent="green" />
              <StatCard label="จำนวนรายการเบิก" value={formatNumber(s?.totalExpenseCount)} icon={Receipt} accent="blue" />
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <MonthlySpendChart data={monthlyQuery.data} isLoading={monthlyQuery.isLoading} />
        <ExpensePieChart data={byCategoryQuery.data} isLoading={byCategoryQuery.isLoading} />
        <CategoryBudgetChart data={byCategoryQuery.data} isLoading={byCategoryQuery.isLoading} />
        <ProjectBudgetChart data={byProjectQuery.data} isLoading={byProjectQuery.isLoading} />
      </div>
    </div>
  );
}
