"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProcessingNotifier } from "@/components/processing-notifier";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api-client";
import { clearTokens, isAuthenticated } from "@/lib/auth";
import type { User } from "@/types/auth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Compare", href: "/compare", icon: GitCompareArrows },
  { label: "Team", href: "/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [processingCount, setProcessingCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/");
      return;
    }

    api
      .get<User>("/api/auth/me")
      .then(setUser)
      .catch(() => {
        clearTokens();
        router.replace("/");
      });
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated()) return;

    async function poll() {
      try {
        const data = await api.get<{
          documents: Array<{ status: string }>;
          total: number;
        }>("/api/documents?limit=100&offset=0");
        setProcessingCount(
          data.documents.filter(
            (d) => d.status === "processing" || d.status === "uploaded",
          ).length,
        );
      } catch {
        // silent — badge is non-critical
      }
    }

    poll();
    const timer = setInterval(poll, 15_000);
    return () => clearInterval(timer);
  }, []);

  function handleLogout() {
    clearTokens();
    router.replace("/login");
  }

  /** Check if a nav item is active (prefix match). */
  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-muted/40">
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
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.href === "/documents" && processingCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white animate-pulse">
                    {processingCount > 9 ? "9+" : processingCount}
                  </span>
                )}
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

          <div className="flex items-center gap-3">
            <ThemeToggle />
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
        <ProcessingNotifier />
      </div>
    </div>
  );
}
