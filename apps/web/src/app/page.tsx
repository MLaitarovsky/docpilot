"use client";

import Link from "next/link";
import {
  FileSearch,
  GitCompareArrows,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth";

const FEATURES = [
  {
    icon: FileSearch,
    title: "Upload & Extract",
    description:
      "Upload PDF contracts and automatically extract key fields — parties, dates, payment terms, and more — using GPT-4o with structured output.",
  },
  {
    icon: ShieldAlert,
    title: "Risk Analysis",
    description:
      "AI flags risky clauses like non-competes, liability caps, and auto-renewals with plain-English explanations and confidence scores.",
  },
  {
    icon: GitCompareArrows,
    title: "Compare Contracts",
    description:
      "Side-by-side field-level diffing between any two contracts. Instantly spot what changed, what's missing, and what matches.",
  },
];

export default function LandingPage() {
  const authed = typeof window !== "undefined" && isAuthenticated();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <span className="text-lg font-bold tracking-tight">DocPilot</span>
          <div className="flex items-center gap-3">
            {authed ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          AI-Powered Contract Review
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          Upload PDF contracts and let AI extract key fields, flag risky
          clauses, and compare documents — in seconds, not hours.
        </p>
        <div className="mt-8">
          {authed ? (
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button size="lg" asChild>
              <Link href="/register">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold tracking-tight">
            How It Works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <f.icon className="h-5 w-5 text-slate-700" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} DocPilot &middot; MIT License
      </footer>
    </div>
  );
}
