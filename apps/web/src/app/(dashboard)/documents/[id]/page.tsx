"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  File,
  FileText,
  Hash,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClauseRiskBadge } from "@/components/clause-risk-badge";
import { ConfidenceIndicator } from "@/components/confidence-indicator";
import { ExtractionCard } from "@/components/extraction-card";
import { ProcessingProgress } from "@/components/processing-progress";
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

  async function handleReprocess() {
    setIsReprocessing(true);
    try {
      await api.post(`/api/documents/${id}/reprocess`);
      toast.success("Re-processing started. This may take a moment.");
      refetch();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to re-process document.";
      toast.error(msg);
    } finally {
      setIsReprocessing(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
        </div>
      </div>

      <Separator />

      {/* If still processing, show progress instead of tabs */}
      {doc.status === "processing" && (
        <Card>
          <CardContent className="pt-6">
            <ProcessingProgress jobId="" documentId={doc.id} />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Refresh the page to check for updated results.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Completed — show tabs */}
      {doc.status === "completed" && (
        <Tabs defaultValue="fields">
          <TabsList>
            <TabsTrigger value="fields">Extracted Fields</TabsTrigger>
            <TabsTrigger value="risks">
              Risk Analysis
              {doc.clauses.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  {doc.clauses.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="raw">Raw Text</TabsTrigger>
          </TabsList>

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

          {/* ── Risk Analysis ── */}
          <TabsContent value="risks" className="mt-4">
            {doc.clauses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No clauses were identified.
              </p>
            ) : (
              <div className="space-y-4">
                {doc.clauses.map((clause) => (
                  <Card key={clause.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <CardTitle className="text-sm font-semibold">
                          {clause.clause_type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <ClauseRiskBadge riskLevel={clause.risk_level} />
                          <ConfidenceIndicator
                            confidence={clause.confidence}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Original text */}
                      <blockquote className="border-l-2 border-muted-foreground/20 pl-4 text-sm text-muted-foreground italic">
                        &ldquo;{clause.original_text}&rdquo;
                      </blockquote>

                      {/* Plain summary */}
                      <p className="text-sm">{clause.plain_summary}</p>

                      {/* Risk reason (medium/high only) */}
                      {(clause.risk_level === "medium" ||
                        clause.risk_level === "high") &&
                        clause.risk_reason && (
                          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            <span className="font-medium">Why this is flagged: </span>
                            {clause.risk_reason}
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
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Raw Text ── */}
          <TabsContent value="raw" className="mt-4">
            {doc.raw_text ? (
              <Card>
                <CardContent className="pt-6">
                  <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-xs leading-relaxed">
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

      {/* Re-process button (visible for completed and failed) */}
      {(doc.status === "completed" || doc.status === "failed") && (
        <div className="flex justify-center">
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
