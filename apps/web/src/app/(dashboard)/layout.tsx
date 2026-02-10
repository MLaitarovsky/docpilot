"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { clearTokens, isAuthenticated } from "@/lib/auth";
import type { User } from "@/types/auth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Documents", href: "/documents" },
  { label: "Compare", href: "/compare" },
  { label: "Team", href: "/team" },
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-slate-50">
        <div className="border-b px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight">DocPilot</h1>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-slate-200 text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
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
              Logout
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
