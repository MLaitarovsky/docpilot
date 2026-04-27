"use client";

interface RiskScoreBadgeProps {
  score: "red" | "amber" | "green" | null | undefined;
  className?: string;
}

const SCORE_CONFIG = {
  red: {
    label: "High Risk",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border border-red-200",
  },
  amber: {
    label: "Medium Risk",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  green: {
    label: "Low Risk",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
} as const;

export function RiskScoreBadge({ score, className = "" }: RiskScoreBadgeProps) {
  if (!score) return null;

  const config = SCORE_CONFIG[score];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
