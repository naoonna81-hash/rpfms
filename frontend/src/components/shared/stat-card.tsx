import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  accent?: "blue" | "gray" | "green" | "red";
  className?: string;
}

const accentMap = {
  blue: "bg-primary/10 text-primary",
  gray: "bg-muted text-muted-foreground",
  green: "bg-success/10 text-success",
  red: "bg-destructive/10 text-destructive",
};

export function StatCard({ label, value, icon: Icon, hint, trend, accent = "blue", className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
          <p className="mt-1.5 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground truncate">{hint}</p>}
          {trend && (
            <p className={cn("mt-1 text-xs font-medium", trend.positive ? "text-success" : "text-destructive")}>
              {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", accentMap[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
        <div className="h-6 w-32 rounded bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}
