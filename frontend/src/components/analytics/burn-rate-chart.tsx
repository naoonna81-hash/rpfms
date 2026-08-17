"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/shared/states";
import { formatCurrency, formatThaiMonthYear } from "@/lib/utils";
import { chartLabelStyle, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import type { BurnRatePoint } from "@/types";

export function BurnRateChart({ data, isLoading }: { data?: BurnRatePoint[]; isLoading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Burn Rate รายเดือน</CardTitle>
        <CardDescription>เปรียบเทียบยอดใช้จ่ายจริงกับแผนการใช้งบประมาณ</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState className="h-72" />
        ) : !data || data.length === 0 ? (
          <EmptyState className="h-72" title="ยังไม่มีข้อมูล Burn Rate" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tickFormatter={(m: string) => formatThaiMonthYear(`${m}-01`)}
                tick={chartLabelStyle}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                tick={chartLabelStyle}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v: number) => new Intl.NumberFormat("th-TH", { notation: "compact" }).format(v)}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelFormatter={(m: string) => formatThaiMonthYear(`${m}-01`)}
                formatter={(value: number, name: string) => [formatCurrency(value, { withSymbol: true }), name === "planned" ? "แผน" : "ใช้จ่ายจริง"]}
              />
              <Legend formatter={(v: string) => (v === "planned" ? "แผน" : "ใช้จ่ายจริง")} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="planned" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="actual" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
