"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/shared/states";
import { formatCurrency, formatThaiMonthYear } from "@/lib/utils";
import { chartLabelStyle, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import type { MonthlyPoint } from "@/types";

export function MonthlySpendChart({ data, isLoading }: { data?: MonthlyPoint[]; isLoading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ยอดใช้จ่ายรายเดือน</CardTitle>
        <CardDescription>แนวโน้มการเบิกจ่ายงบประมาณในแต่ละเดือน</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState className="h-64" />
        ) : !data || data.length === 0 ? (
          <EmptyState className="h-64" title="ยังไม่มีข้อมูลรายจ่าย" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tickFormatter={(m: string) => formatThaiMonthYear(`${m}-01`)}
                tick={chartLabelStyle}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                minTickGap={16}
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
                labelFormatter={(m: string) => formatThaiMonthYear(`${m}-01`)}
                formatter={(value: number) => [formatCurrency(value, { withSymbol: true }), "ยอดใช้จ่าย"]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fill="url(#spendFill)"
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
