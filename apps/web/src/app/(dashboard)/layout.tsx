"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api-client";
import { clearTokens, isAuthenticated } from "@/lib/auth";
import type { User } from "@/types/auth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Compare", href: "/compare", icon: GitCompareArrows },
  { label: "Team", href: "/team", icon: Users },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    api
      .get<User>("/api/auth/me")
      .then(setUser)
      .catch(() => {
        clearTokens();
        router.replace("/login");
      });
  }, [router]);

  function handleLogout() {
    clearTokens();
    router.replace("/login");
  }

  /** Check if a nav item is active (exact match for "/", prefix for others). */
  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-slate-50">
        <div className="px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight">DocPilot</h1>
          {user?.team && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {user.team.name}
            </p>
          )}
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b px-6">
          <span className="text-sm text-muted-foreground">
            {user?.team?.name ?? ""}
          </span>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {user?.full_name ?? "Loading..."}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
