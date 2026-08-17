"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { LoadingState } from "@/components/shared/states";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="กำลังตรวจสอบสิทธิ์การเข้าใช้งาน..." />
      </div>
    );
  }

  if (!user) return null;

  return <AppShell>{children}</AppShell>;
}
