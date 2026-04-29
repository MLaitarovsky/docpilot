"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Download,
  File,
  FileText,
  Hash,
  Loader2,
  RotateCcw,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClauseRiskBadge } from "@/components/clause-risk-badge";
import { ExtractionCard } from "@/components/extraction-card";
import { MissingClausesChecklist } from "@/components/missing-clauses-checklist";
import { ProcessingProgress } from "@/components/processing-progress";
import { RiskScoreBadge } from "@/components/risk-score-badge";
import { api, ApiError } from "@/lib/api-client";
import { useDocument } from "@/hooks/use-documents";

// ── Helpers ──

const STATUS_STYLES: Record<string, string> = {
  uploaded: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
  processing:
    "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 animate-pulse",
  completed:
    "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  failed: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
};

const DOC_TYPE_STYLES: Record<string, string> = {
  nda: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
  service_agreement:
    "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  employment_contract:
    "bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100",
  lease: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
  saas_terms:
    "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
  other: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
};

const RTL_LANGUAGES = new Set(["he", "ar", "fa", "ur"]);

function formatDocType(type: string | null): string {
  if (!type) return "Pending";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatClauseType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Copy button ──

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="Copy to clipboard"
      aria-label={label ?? "Copy"}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-500" />
          <span className="text-emerald-600">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

// ── Loading skeleton ──

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-9 w-80" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

// ── Page component ──

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { document: doc, isLoading, error, refetch } = useDocument(id);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessJobId, setReprocessJobId] = useState<string | null>(null);
  const [clauseFilter, setClauseFilter] = useState<"all" | "high" | "medium" | "low">("all");

  async function handleReprocess() {
    setIsReprocessing(true);
    try {
      const res = await api.post<{ task_id: string }>(`/api/documents/${id}/reprocess`);
      setReprocessJobId(res.task_id);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to re-process document.";
      toast.error(msg);
    } finally {
      setIsReprocessing(false);
    }
  }

  function handleExportPdf() {
    window.print();
  }

  if (isLoading) return <DetailSkeleton />;

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-sm text-muted-foreground">
          {error ?? "Document not found."}
        </p>
        <Button variant="outline" asChild>
          <Link href="/documents">Back to Documents</Link>
        </Button>
      </div>
    );
  }

  const extraction = doc.extractions?.[0] ?? null;
  const isRtl = RTL_LANGUAGES.has(doc.detected_language ?? "");
  const dir = isRtl ? "rtl" : "ltr";
  const visibleClauses =
    clauseFilter === "all"
      ? doc.clauses
      : doc.clauses.filter((c) => c.risk_level === clauseFilter);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground print:hidden">
        <Link
          href="/documents"
          className="hover:text-foreground transition-colors"
        >
          Documents
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate max-w-[240px] text-foreground font-medium">
          {doc.filename}
        </span>
      </nav>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold tracking-tight truncate max-w-xl">
              {doc.filename}
            </h2>
            {doc.doc_type && (
              <Badge
                className={
                  DOC_TYPE_STYLES[doc.doc_type] ?? DOC_TYPE_STYLES.other
                }
              >
                {formatDocType(doc.doc_type)}
              </Badge>
            )}
            <Badge
              className={STATUS_STYLES[doc.status] ?? STATUS_STYLES.uploaded}
            >
              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
            </Badge>
            {doc.status === "completed" && doc.risk_score && (
              <RiskScoreBadge score={doc.risk_score} />
            )}
          </div>

          {doc.status === "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="print:hidden shrink-0"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          )}
        </div>

        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(doc.created_at)}
          </span>
          {doc.page_count && (
            <span className="flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" />
              {doc.page_count} pages
            </span>
          )}
          <span className="flex items-center gap-1">
            <File className="h-3.5 w-3.5" />
            {formatSize(doc.file_size_bytes)}
          </span>
          {doc.detected_language && doc.detected_language !== "en" && (
            <span className="flex items-center gap-1 uppercase font-medium text-xs tracking-wide">
              {doc.detected_language}
            </span>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      {doc.status === "completed" && doc.executive_summary && (
        <Card className="border-slate-200 bg-slate-50 print:border print:shadow-none">
          <CardContent className="pt-4 pb-4">
            <p
              className="text-sm leading-relaxed text-slate-700"
              dir={dir}
            >
              {doc.executive_summary}
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Active reprocess — live SSE progress */}
      {reprocessJobId && (
        <Card>
          <CardContent className="pt-6">
            <ProcessingProgress
              jobId={reprocessJobId}
              documentId={doc.id}
              onComplete={() => {
                setReprocessJobId(null);
                refetch();
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Initial processing (no job ID available) */}
      {doc.status === "processing" && !reprocessJobId && (
        <Card>
          <CardContent className="pt-6">
            <ProcessingProgress jobId={null} documentId={doc.id} />
          </CardContent>
        </Card>
      )}

      {/* Completed — show tabs */}
      {doc.status === "completed" && !reprocessJobId && (
        <Tabs defaultValue="risks">
          <TabsList className="print:hidden">
            <TabsTrigger value="risks">
              Risk Analysis
              {doc.clauses.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  {doc.clauses.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="fields">Extracted Fields</TabsTrigger>
            <TabsTrigger value="raw">Raw Text</TabsTrigger>
          </TabsList>

          {/* ── Risk Analysis ── */}
          <TabsContent value="risks" className="mt-4 print:block">
            <div className="space-y-4">
              {/* Missing clauses checklist */}
              <MissingClausesChecklist missingClauses={doc.missing_clauses} />

              {doc.clauses.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 print:hidden">
                  {(["all", "high", "medium", "low"] as const).map((f) => (
                    <Button
                      key={f}
                      variant={clauseFilter === f ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-3 text-xs"
                      onClick={() => setClauseFilter(f)}
                    >
                      {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                      {f !== "all" && (
                        <span className="ml-1 opacity-60">
                          ({doc.clauses.filter((c) => c.risk_level === f).length})
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              )}

              {doc.clauses.length === 0 ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-6 text-center">
                  <p className="text-sm font-medium text-emerald-700">
                    No risky clauses identified
                  </p>
                  <p className="mt-1 text-xs text-emerald-600">
                    This contract appears to contain only standard, routine terms.
                  </p>
                </div>
              ) : visibleClauses.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No {clauseFilter} risk clauses.
                </p>
              ) : (
                visibleClauses.map((clause) => (
                  <Card key={clause.id} className="print:break-inside-avoid print:shadow-none">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <CardTitle className="text-sm font-semibold">
                          {formatClauseType(clause.clause_type)}
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          {clause.unfavorable_to && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 border border-slate-200">
                              <User className="h-3 w-3" />
                              Unfavorable to: {clause.unfavorable_to}
                            </span>
                          )}
                          <ClauseRiskBadge riskLevel={clause.risk_level} />
                          <span className="print:hidden">
                            <CopyButton
                              text={clause.original_text}
                              label="Copy clause text"
                            />
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3" dir={dir}>
                      {/* Original text */}
                      <blockquote className="border-l-2 border-muted-foreground/20 pl-4 text-sm text-muted-foreground italic">
                        &ldquo;{clause.original_text}&rdquo;
                      </blockquote>

                      {/* Plain summary */}
                      <p className="text-sm">{clause.plain_summary}</p>

                      {/* Risk reason */}
                      {(clause.risk_level === "medium" ||
                        clause.risk_level === "high") &&
                        clause.risk_reason && (
                          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            <span className="font-medium">Why this is flagged: </span>
                            {clause.risk_reason}
                          </div>
                        )}

                      {/* Suggested alternative */}
                      {clause.suggested_alternative && (
                        <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
                          <span className="font-medium">Suggested language: </span>
                          {clause.suggested_alternative}
                        </div>
                      )}

                      {/* Page ref */}
                      {clause.page_number && (
                        <p className="text-xs text-muted-foreground">
                          Page {clause.page_number}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ── Extracted Fields ── */}
          <TabsContent value="fields" className="mt-4">
            {extraction ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Model: {extraction.model_used} &middot;{" "}
                  {extraction.processing_ms}ms
                </p>
                <ExtractionCard
                  extraction={extraction}
                  docType={doc.doc_type ?? "other"}
                />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No extraction data available.
              </p>
            )}
          </TabsContent>

          {/* ── Raw Text ── */}
          <TabsContent value="raw" className="mt-4">
            {doc.raw_text ? (
              <Card>
                <CardContent className="pt-6">
                  <pre
                    className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-xs leading-relaxed"
                    dir={dir}
                  >
                    {doc.raw_text}
                  </pre>
                </CardContent>
              </Card>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No raw text available.
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Re-process button (visible for completed and failed, hidden while reprocessing) */}
      {(doc.status === "completed" || doc.status === "failed") && !reprocessJobId && (
        <div className="flex justify-center print:hidden">
          <Button
            variant="outline"
            onClick={handleReprocess}
            disabled={isReprocessing}
          >
            {isReprocessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Re-processing...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Re-process Document
              </>
            )}
          </Button>
        </div>
      )}

      {/* Failed state */}
      {doc.status === "failed" && (
        <Card className="border-red-200">
          <CardContent className="flex flex-col items-center gap-2 py-10">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <p className="font-medium text-red-700">Processing Failed</p>
            <p className="text-sm text-muted-foreground">
              The extraction pipeline encountered an error. Click &ldquo;Re-process
              Document&rdquo; above to try again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Uploaded but not yet processing */}
      {doc.status === "uploaded" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              This document is queued for processing.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
