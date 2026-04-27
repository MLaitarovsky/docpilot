"use client";

import { AlertCircle } from "lucide-react";

interface MissingClausesChecklistProps {
  missingClauses: string[] | null | undefined;
}

const CLAUSE_LABELS: Record<string, string> = {
  limitation_of_liability: "Limitation of Liability",
  confidentiality: "Confidentiality / NDA",
  ip_ownership: "IP Ownership",
  termination_for_cause: "Termination for Cause",
  governing_law: "Governing Law",
  dispute_resolution: "Dispute Resolution",
  data_protection: "Data Protection",
  severability: "Severability",
  payment_terms: "Payment Terms",
  non_solicitation: "Non-Solicitation",
};

export function MissingClausesChecklist({
  missingClauses,
}: MissingClausesChecklistProps) {
  if (!missingClauses || missingClauses.length === 0) return null;

  return (
    <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-orange-600 shrink-0" />
        <span className="text-sm font-semibold text-orange-800">
          Missing Protections
        </span>
      </div>
      <p className="text-xs text-orange-700 mb-3">
        These standard clauses are absent and should be added before signing:
      </p>
      <ul className="space-y-1">
        {missingClauses.map((key) => (
          <li key={key} className="flex items-center gap-2 text-sm text-orange-800">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
            {CLAUSE_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </li>
        ))}
      </ul>
    </div>
  );
}
