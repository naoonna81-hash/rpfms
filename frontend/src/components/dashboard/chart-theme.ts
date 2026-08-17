import type { CSSProperties, SVGProps } from "react";

// สีชุดกราฟ (categorical) อ้างอิงจาก dataviz skill validated palette
// เรียงลำดับตายตัว ห้ามสลับ/หมุนสี — ให้เพิ่มหมวด "อื่นๆ" แทนถ้าเกิน 6 ชุด
export const CHART_COLORS = [
  "hsl(var(--chart-1))", // blue
  "hsl(var(--chart-2))", // orange
  "hsl(var(--chart-3))", // aqua
  "hsl(var(--chart-4))", // yellow
  "hsl(var(--chart-5))", // magenta
  "hsl(var(--chart-6))", // violet
];

export const CHART_GRID_STROKE = "hsl(var(--border))";
export const CHART_AXIS_STROKE = "hsl(var(--muted-foreground))";
export const CHART_MUTED_FILL = "hsl(var(--muted-foreground) / 0.35)";

export const chartTooltipStyle: CSSProperties = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--popover-foreground))",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  padding: "8px 12px",
};

export const chartLabelStyle: SVGProps<SVGTextElement> = {
  fontSize: 12,
  fill: "hsl(var(--muted-foreground))",
};
