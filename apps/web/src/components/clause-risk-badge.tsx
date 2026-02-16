import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ClauseRiskBadgeProps {
  riskLevel: "low" | "medium" | "high";
}

const RISK_STYLES: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
  medium: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
  high: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
};

const RISK_LABELS: Record<string, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
};

export function ClauseRiskBadge({ riskLevel }: ClauseRiskBadgeProps) {
  return (
    <Badge className={cn("text-xs font-medium", RISK_STYLES[riskLevel])}>
      {RISK_LABELS[riskLevel]}
    </Badge>
  );
}
