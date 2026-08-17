"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/shared/states";
import { formatCurrency } from "@/lib/utils";
import { chartLabelStyle, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import type { CategoryBreakdown } from "@/types";

export function CategoryBudgetChart({ data, isLoading }: { data?: CategoryBreakdown[]; isLoading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>งบประมาณตามหมวดหมู่</CardTitle>
        <CardDescription>เปรียบเทียบงบที่จัดสรรกับยอดใช้จ่ายจริงในแต่ละหมวด</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState className="h-72" />
        ) : !data || data.length === 0 ? (
          <EmptyState className="h-72" title="ยังไม่มีข้อมูลหมวดงบประมาณ" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(280, data.length * 46)}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                tick={chartLabelStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => new Intl.NumberFormat("th-TH", { notation: "compact" }).format(v)}
              />
              <YAxis
                type="category"
                dataKey="categoryName"
                tick={chartLabelStyle}
                axisLine={false}
                tickLine={false}
                width={150}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: number, name: string) => [
                  formatCurrency(value, { withSymbol: true }),
                  name === "allocatedAmount" ? "งบจัดสรร" : "ใช้จ่ายแล้ว",
                ]}
              />
              <Legend
                formatter={(v: string) => (v === "allocatedAmount" ? "งบจัดสรร" : "ใช้จ่ายแล้ว")}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="allocatedAmount" fill="hsl(var(--muted-foreground) / 0.25)" radius={[4, 4, 4, 4]} maxBarSize={16} />
              <Bar dataKey="spentAmount" fill="hsl(var(--chart-1))" radius={[4, 4, 4, 4]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
