"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { notificationsApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatThaiDate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/states";

export function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications", "bell"],
    queryFn: () => notificationsApi.list({ page: 1, limit: 6 }),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const unreadCount = data?.items.filter((n) => !n.isRead).length ?? 0;

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="การแจ้งเตือน">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>การแจ้งเตือน</span>
          {unreadCount > 0 && <Badge variant="info">{unreadCount} ใหม่</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!data || data.items.length === 0 ? (
          <div className="p-2">
            <EmptyState title="ไม่มีการแจ้งเตือน" className="py-6" />
          </div>
        ) : (
          data.items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start gap-0.5 whitespace-normal py-2"
              onClick={() => !n.isRead && markRead(n.id)}
            >
              <span className={n.isRead ? "text-muted-foreground" : "font-medium"}>{n.message}</span>
              <span className="text-[11px] text-muted-foreground">{formatThaiDate(n.createdAt)}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="justify-center text-primary">
            ดูการแจ้งเตือนทั้งหมด
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
