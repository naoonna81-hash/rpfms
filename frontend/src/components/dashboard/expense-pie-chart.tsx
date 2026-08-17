"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/shared/states";
import { formatCurrency } from "@/lib/utils";
import { CHART_COLORS, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import type { CategoryBreakdown } from "@/types";

const OTHER_COLOR = "hsl(var(--muted-foreground) / 0.4)";

export function ExpensePieChart({ data, isLoading }: { data?: CategoryBreakdown[]; isLoading?: boolean }) {
  // พับหมวดเกิน 6 ลงเป็น "อื่นๆ" ตามหลัก categorical palette ที่ไม่หมุนสีเกินจำนวนที่ผ่านการ validate
  let chartData: { name: string; value: number }[] = [];
  if (data && data.length > 0) {
    const sorted = [...data].sort((a, b) => b.spentAmount - a.spentAmount);
    const head = sorted.slice(0, 6).map((c) => ({ name: c.categoryName, value: c.spentAmount }));
    const rest = sorted.slice(6);
    const restSum = rest.reduce((s, c) => s + c.spentAmount, 0);
    chartData = restSum > 0 ? [...head, { name: "อื่นๆ", value: restSum }] : head;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>สัดส่วนรายจ่ายตามหมวดหมู่</CardTitle>
        <CardDescription>สัดส่วนยอดใช้จ่ายจริงแยกตามหมวดงบประมาณ</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState className="h-72" />
        ) : chartData.length === 0 ? (
          <EmptyState className="h-72" title="ยังไม่มีข้อมูลรายจ่าย" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                strokeWidth={2}
                stroke="hsl(var(--card))"
              >
                {chartData.map((entry, i) => (
                  <Cell key={entry.name} fill={entry.name === "อื่นๆ" ? OTHER_COLOR : CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: number, name: string) => [formatCurrency(value, { withSymbol: true }), name]}
              />
              <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
