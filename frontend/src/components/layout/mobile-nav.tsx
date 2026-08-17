"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-config";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function MobileNavDrawer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">เปิดเมนู</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground flex flex-col p-0">
        <SheetHeader className="h-14 flex-row items-center gap-2 border-b border-sidebar-border px-4 space-y-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
            <Stethoscope className="h-4.5 w-4.5" />
          </div>
          <SheetTitle className="text-sidebar-foreground text-sm">RPFMS</SheetTitle>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-white/5",
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const items = [
    navItems[0],
    navItems[1],
    navItems[2],
    navItems[3],
    navItems[8],
  ];
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate max-w-[56px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
