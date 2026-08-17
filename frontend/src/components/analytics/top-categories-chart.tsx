"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/shared/states";
import { formatCurrency } from "@/lib/utils";
import { CHART_COLORS, chartLabelStyle, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import type { TopCategory } from "@/types";

export function TopCategoriesChart({ data, isLoading }: { data?: TopCategory[]; isLoading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>หมวดที่ใช้จ่ายสูงสุด</CardTitle>
        <CardDescription>อันดับหมวดงบประมาณที่มียอดใช้จ่ายสูงสุดของโครงการ</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState className="h-72" />
        ) : !data || data.length === 0 ? (
          <EmptyState className="h-72" title="ยังไม่มีข้อมูล" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, data.length * 44)}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                tick={chartLabelStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => new Intl.NumberFormat("th-TH", { notation: "compact" }).format(v)}
              />
              <YAxis type="category" dataKey="categoryName" tick={chartLabelStyle} axisLine={false} tickLine={false} width={150} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [formatCurrency(value, { withSymbol: true }), "ใช้จ่าย"]} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {data.map((entry, i) => (
                  <Cell key={entry.categoryId} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
