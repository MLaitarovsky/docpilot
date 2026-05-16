"use client";

import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

import type { DocumentDetail } from "@/types/document";

interface VerdictHeroProps {
  doc: DocumentDetail;
  dir?: "ltr" | "rtl";
}

type RiskScore = "red" | "amber" | "green";

const VERDICT_CONFIG: Record<
  RiskScore,
  {
    label: string;
    sub: string;
    icon: typeof ShieldCheck;
    ring: string;
    bg: string;
    accent: string;
    iconWrap: string;
    bar: string;
  }
> = {
  red: {
    label: "High Risk — Do Not Sign As-Is",
    sub: "This contract contains terms that could cause real financial or legal harm. Get legal review before signing.",
    icon: ShieldAlert,
    ring: "border-red-200",
    bg: "bg-gradient-to-br from-red-50 to-white",
    accent: "text-red-700",
    iconWrap: "bg-red-100 text-red-600",
    bar: "bg-red-500",
  },
  amber: {
    label: "Review Carefully Before Signing",
    sub: "There are negotiable issues worth raising. Understand each flagged clause before you commit.",
    icon: AlertTriangle,
    ring: "border-amber-200",
    bg: "bg-gradient-to-br from-amber-50 to-white",
    accent: "text-amber-700",
    iconWrap: "bg-amber-100 text-amber-600",
    bar: "bg-amber-500",
  },
  green: {
    label: "Standard — Relatively Safe to Sign",
    sub: "Only routine terms were found. No significant red flags, though a quick read is always wise.",
    icon: ShieldCheck,
    ring: "border-emerald-200",
    bg: "bg-gradient-to-br from-emerald-50 to-white",
    accent: "text-emerald-700",
    iconWrap: "bg-emerald-100 text-emerald-600",
    bar: "bg-emerald-500",
  },
};

function formatClauseType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build fallback bullet points from the riskiest clauses (for documents
 *  processed before key_points existed). */
function derivePoints(doc: DocumentDetail): string[] {
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...doc.clauses]
    .sort(
      (a, b) =>
        (rank[a.risk_level ?? "low"] ?? 3) - (rank[b.risk_level ?? "low"] ?? 3),
    )
    .slice(0, 4)
    .map(
      (c) =>
        `${formatClauseType(c.clause_type)}: ${
          c.plain_summary ?? c.risk_reason ?? "flagged for review"
        }`,
    );
}

export function VerdictHero({ doc, dir = "ltr" }: VerdictHeroProps) {
  const score: RiskScore = (doc.risk_score as RiskScore) ?? "green";
  const config = VERDICT_CONFIG[score] ?? VERDICT_CONFIG.green;
  const Icon = config.icon;

  const counts = { high: 0, medium: 0, low: 0 };
  for (const c of doc.clauses) {
    if (c.risk_level === "high") counts.high += 1;
    else if (c.risk_level === "medium") counts.medium += 1;
    else if (c.risk_level === "low") counts.low += 1;
  }
  const missingCount = doc.missing_clauses?.length ?? 0;

  const points =
    doc.key_points && doc.key_points.length > 0
      ? doc.key_points
      : derivePoints(doc);

  const stats: { label: string; value: number; tone: string }[] = [
    { label: "High risk", value: counts.high, tone: "text-red-600" },
    { label: "Medium risk", value: counts.medium, tone: "text-amber-600" },
    { label: "Low risk", value: counts.low, tone: "text-emerald-600" },
    { label: "Missing protections", value: missingCount, tone: "text-orange-600" },
  ];

  return (
    <div
      className={`overflow-hidden rounded-xl border ${config.ring} ${config.bg} print:border print:shadow-none`}
    >
      <div className={`h-1 w-full ${config.bar}`} />
      <div className="p-5 sm:p-6">
        {/* Verdict line */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${config.iconWrap}`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Verdict
            </p>
            <h3 className={`text-xl font-bold leading-tight ${config.accent}`}>
              {config.label}
            </h3>
            <p className="mt-1 text-sm text-slate-600">{config.sub}</p>
          </div>
        </div>

        {/* Stat chips */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-center"
            >
              <p className={`text-2xl font-bold tabular-nums ${s.tone}`}>
                {s.value}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* What you need to know */}
        {points.length > 0 && (
          <div className="mt-5" dir={dir}>
            <p className="mb-2 text-sm font-semibold text-slate-700">
              What you need to know
            </p>
            <ul className="space-y-1.5">
              {points.map((p, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed text-slate-700"
                >
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${config.bar}`}
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Supporting summary */}
        {doc.executive_summary && (
          <p
            className="mt-5 border-t border-slate-200 pt-4 text-sm leading-relaxed text-slate-600"
            dir={dir}
          >
            {doc.executive_summary}
          </p>
        )}
      </div>
    </div>
  );
}
