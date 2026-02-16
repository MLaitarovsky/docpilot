"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClauseRiskBadge } from "@/components/clause-risk-badge";
import type { ComparisonResult, FieldDiffEntry } from "@/types/comparison";

interface ContractDiffViewProps {
  comparison: ComparisonResult;
}

// ── Helpers ──

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatClauseType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS_ROW_COLORS: Record<string, string> = {
  match: "bg-emerald-50/60",
  different: "bg-red-50/60",
  only_in_a: "bg-slate-50",
  only_in_b: "bg-slate-50",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  match:
    "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  different: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  only_in_a: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100",
  only_in_b: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100",
};

const STATUS_LABELS: Record<string, string> = {
  match: "Match",
  different: "Different",
  only_in_a: "Only in A",
  only_in_b: "Only in B",
};

function CellValue({ value }: { value: string | null | undefined }) {
  if (value === null || value === undefined || value === "None") {
    return <span className="text-muted-foreground italic">—</span>;
  }
  return <span>{value}</span>;
}

function getDisplayValues(entry: FieldDiffEntry) {
  switch (entry.status) {
    case "match":
      return { a: entry.value, b: entry.value };
    case "different":
      return { a: entry.doc_a, b: entry.doc_b };
    case "only_in_a":
      return { a: entry.doc_a, b: null };
    case "only_in_b":
      return { a: null, b: entry.doc_b };
  }
}

// ── Summary Bar ──

function SummaryBar({
  summary,
}: {
  summary: ComparisonResult["diff_result"]["summary"];
}) {
  const items = [
    {
      label: "Matching",
      count: summary.matching,
      color: "bg-emerald-500",
      text: "text-emerald-700",
    },
    {
      label: "Different",
      count: summary.different,
      color: "bg-red-500",
      text: "text-red-700",
    },
    {
      label: "Only in A",
      count: summary.only_in_a,
      color: "bg-slate-400",
      text: "text-slate-600",
    },
    {
      label: "Only in B",
      count: summary.only_in_b,
      color: "bg-slate-400",
      text: "text-slate-600",
    },
  ];

  const total = summary.total_fields || 1;

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Progress bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {items.map(
            (item) =>
              item.count > 0 && (
                <div
                  key={item.label}
                  className={`${item.color} transition-all`}
                  style={{ width: `${(item.count / total) * 100}%` }}
                />
              ),
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span className={`text-sm font-medium ${item.text}`}>
                {item.count} {item.label}
              </span>
            </div>
          ))}
          <div className="ml-auto text-sm text-muted-foreground">
            {summary.total_fields} total fields
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ──

export function ContractDiffView({ comparison }: ContractDiffViewProps) {
  const { field_diff, clause_diff, summary } = comparison.diff_result;
  const fields = Object.entries(field_diff);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <SummaryBar summary={summary} />

      {/* Field Comparison Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Field Comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Field</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-700">
                      A
                    </span>
                    <span className="truncate max-w-[200px]">
                      {comparison.doc_a_filename}
                    </span>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-purple-100 text-[10px] font-bold text-purple-700">
                      B
                    </span>
                    <span className="truncate max-w-[200px]">
                      {comparison.doc_b_filename}
                    </span>
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map(([key, entry]) => {
                const vals = getDisplayValues(entry);
                return (
                  <TableRow
                    key={key}
                    className={STATUS_ROW_COLORS[entry.status]}
                  >
                    <TableCell className="font-medium text-xs">
                      {formatFieldLabel(key)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <CellValue value={vals.a} />
                    </TableCell>
                    <TableCell className="text-sm">
                      <CellValue value={vals.b} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[10px] ${STATUS_BADGE_STYLES[entry.status]}`}
                      >
                        {STATUS_LABELS[entry.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {fields.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    No fields to compare.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Clause Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Clause Comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Shared clauses */}
          {clause_diff.shared.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Shared Clauses
              </p>
              {clause_diff.shared.map((item) => (
                <div
                  key={item.clause_type}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {formatClauseType(item.clause_type)}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-blue-100 text-[9px] font-bold text-blue-700">
                          A
                        </span>
                        {item.risk_a ? (
                          <ClauseRiskBadge
                            riskLevel={
                              item.risk_a as "low" | "medium" | "high"
                            }
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            N/A
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-purple-100 text-[9px] font-bold text-purple-700">
                          B
                        </span>
                        {item.risk_b ? (
                          <ClauseRiskBadge
                            riskLevel={
                              item.risk_b as "low" | "medium" | "high"
                            }
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            N/A
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-md bg-blue-50/50 p-3">
                      <p className="text-xs font-medium text-blue-700 mb-1">
                        Document A
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.summary_a || "No summary"}
                      </p>
                    </div>
                    <div className="rounded-md bg-purple-50/50 p-3">
                      <p className="text-xs font-medium text-purple-700 mb-1">
                        Document B
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.summary_b || "No summary"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Only in A */}
          {clause_diff.only_in_a.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Only in Document A
              </p>
              <div className="flex flex-wrap gap-2">
                {clause_diff.only_in_a.map((ct) => (
                  <Badge
                    key={ct}
                    className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100"
                  >
                    {formatClauseType(ct)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Only in B */}
          {clause_diff.only_in_b.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Only in Document B
              </p>
              <div className="flex flex-wrap gap-2">
                {clause_diff.only_in_b.map((ct) => (
                  <Badge
                    key={ct}
                    className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100"
                  >
                    {formatClauseType(ct)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {clause_diff.shared.length === 0 &&
            clause_diff.only_in_a.length === 0 &&
            clause_diff.only_in_b.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                No clause data to compare.
              </p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
