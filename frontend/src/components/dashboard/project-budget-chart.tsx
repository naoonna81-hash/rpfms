"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/shared/states";
import { formatCurrency } from "@/lib/utils";
import { chartLabelStyle, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import type { ProjectBreakdown } from "@/types";

export function ProjectBudgetChart({ data, isLoading }: { data?: ProjectBreakdown[]; isLoading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>งบประมาณตามโครงการ</CardTitle>
        <CardDescription>งบรวมและยอดใช้จ่ายของแต่ละโครงการ</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState className="h-72" />
        ) : !data || data.length === 0 ? (
          <EmptyState className="h-72" title="ยังไม่มีข้อมูลโครงการ" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="projectName"
                tick={{ ...chartLabelStyle, fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                interval={0}
                tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 12)}…` : v)}
              />
              <YAxis
                tick={chartLabelStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => new Intl.NumberFormat("th-TH", { notation: "compact" }).format(v)}
                width={48}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: number, name: string) => [
                  formatCurrency(value, { withSymbol: true }),
                  name === "totalBudget" ? "งบรวม" : "ใช้จ่ายแล้ว",
                ]}
              />
              <Legend formatter={(v: string) => (v === "totalBudget" ? "งบรวม" : "ใช้จ่ายแล้ว")} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="totalBudget" fill="hsl(var(--muted-foreground) / 0.25)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="spentAmount" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
