"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MobileNavDrawer } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";

export function Topbar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-3 sm:px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <MobileNavDrawer />
      <form onSubmit={onSearch} className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาโครงการ, รายการเบิกจ่าย, นักวิจัย..."
          className="pl-8"
          aria-label="ค้นหา"
        />
      </form>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
