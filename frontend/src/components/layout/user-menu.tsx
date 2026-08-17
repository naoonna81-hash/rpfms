"use client";

import Link from "next/link";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth/auth-context";

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "ผู้ดูแลระบบสูงสุด",
  ADMIN: "ผู้ดูแลระบบ",
  RESEARCHER: "นักวิจัย",
  STAFF: "เจ้าหน้าที่",
  VIEWER: "ผู้เข้าชม",
};

export function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar>
            <AvatarFallback>{initials || <UserIcon className="h-4 w-4" />}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
          <p className="mt-0.5 text-xs font-normal text-primary">{roleLabel[user.role] ?? user.role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" /> ตั้งค่า/โปรไฟล์
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
