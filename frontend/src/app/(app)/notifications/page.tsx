"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, BellRing, CalendarClock, CheckCheck, Info, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notificationsApi } from "@/lib/api/endpoints";
import { ApiClientError } from "@/lib/api/client";
import { cn, formatThaiDate } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types";

const typeConfig: Record<NotificationType, { label: string; icon: typeof BellRing; className: string }> = {
  BUDGET_LOW: { label: "งบใกล้หมด", icon: AlertTriangle, className: "bg-warning/15 text-warning-foreground" },
  BUDGET_OVER: { label: "งบเกินกำหนด", icon: TrendingDown, className: "bg-destructive/15 text-destructive" },
  PENDING_APPROVAL: { label: "รออนุมัติ", icon: BellRing, className: "bg-primary/15 text-primary" },
  PROJECT_ENDING: { label: "โครงการใกล้สิ้นสุด", icon: CalendarClock, className: "bg-primary/15 text-primary" },
  GENERAL: { label: "ทั่วไป", icon: Info, className: "bg-muted text-muted-foreground" },
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["notifications", "page", page],
    queryFn: () => notificationsApi.list({ page, limit: 20 }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast.success("อ่านทั้งหมดแล้ว");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "เกิดข้อผิดพลาด"),
  });

  const unreadCount = query.data?.items.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="แจ้งเตือน"
        description="การแจ้งเตือนเกี่ยวกับงบประมาณและการอนุมัติ"
        actions={
          unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
              <CheckCheck className="h-4 w-4" /> อ่านทั้งหมด
            </Button>
          )
        }
      />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : !query.data || query.data.items.length === 0 ? (
        <EmptyState title="ไม่มีการแจ้งเตือน" />
      ) : (
        <div className="space-y-2">
          {query.data.items.map((n: Notification) => {
            const cfg = typeConfig[n.type] ?? typeConfig.GENERAL;
            const Icon = cfg.icon;
            return (
              <Card
                key={n.id}
                className={cn("cursor-pointer transition-colors", !n.isRead && "border-primary/40 bg-primary/[0.03]")}
                onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", cfg.className)}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="gray" className="text-[10px]">{cfg.label}</Badge>
                      {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <p className={cn("mt-1 text-sm", !n.isRead && "font-medium")}>{n.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatThaiDate(n.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {query.data && (query.data.meta.total ?? 0) > (query.data.meta.limit ?? 20) && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ก่อนหน้า
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil((query.data.meta.total ?? 0) / (query.data.meta.limit ?? 20))}
            onClick={() => setPage((p) => p + 1)}
          >
            ถัดไป
          </Button>
        </div>
      )}
    </div>
  );
}
