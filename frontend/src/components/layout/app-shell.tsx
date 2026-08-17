"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileBottomNav } from "@/components/layout/mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-h-screen flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-3 sm:p-5 lg:p-6 pb-20 lg:pb-6">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
