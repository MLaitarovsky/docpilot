"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  GitCompareArrows,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractDiffView } from "@/components/contract-diff-view";
import { api, ApiError } from "@/lib/api-client";
import type { Document } from "@/types/document";
import type { ComparisonResult } from "@/types/comparison";

// ── Types ──

interface DocumentListResponse {
  documents: Document[];
  total: number;
  limit: number;
  offset: number;
}

interface ComparisonListResponse {
  comparisons: ComparisonResult[];
  total: number;
  limit: number;
  offset: number;
}

// ── Helpers ──

function formatDocType(type: string | null): string {
  if (!type) return "Unknown";
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

// ── Document Selector ──

function DocumentSelector({
  label,
  documents,
  isLoading,
  selectedId,
  excludeId,
  onSelect,
}: {
  label: string;
  documents: Document[];
  isLoading: boolean;
  selectedId: string | null;
  excludeId: string | null;
  onSelect: (id: string) => void;
}) {
  const completed = documents.filter(
    (d) => d.status === "completed" && d.id !== excludeId,
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{label}</p>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">Select a document...</option>
        {completed.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.filename} ({formatDocType(doc.doc_type)})
          </option>
        ))}
      </select>
      {completed.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No completed documents available.
        </p>
      )}
    </div>
  );
}

// ── Page ──

export default function ComparePage() {
  // Documents for selectors
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  // Selection state
  const [docAId, setDocAId] = useState<string | null>(null);
  const [docBId, setDocBId] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Active comparison result
  const [result, setResult] = useState<ComparisonResult | null>(null);

  // History
  const [history, setHistory] = useState<ComparisonResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ComparisonResult | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch documents
  useEffect(() => {
    api
      .get<DocumentListResponse>("/api/documents?limit=100")
      .then((data) => setDocuments(data.documents))
      .catch(() => toast.error("Failed to load documents"))
      .finally(() => setDocsLoading(false));
  }, []);

  // Fetch comparison history
  const fetchHistory = useCallback(() => {
    setHistoryLoading(true);
    api
      .get<ComparisonListResponse>("/api/compare?limit=20")
      .then((data) => setHistory(data.comparisons))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Run comparison
  async function handleCompare() {
    if (!docAId || !docBId) return;
    setIsComparing(true);
    setResult(null);
    try {
      const data = await api.post<ComparisonResult>("/api/compare", {
        doc_a_id: docAId,
        doc_b_id: docBId,
      });
      setResult(data);
      fetchHistory();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Comparison failed.";
      toast.error(msg);
    } finally {
      setIsComparing(false);
    }
  }

  // Load a saved comparison
  function handleLoadHistory(comp: ComparisonResult) {
    setResult(comp);
    setDocAId(comp.doc_a_id);
    setDocBId(comp.doc_b_id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Delete a comparison
  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/compare/${deleteTarget.id}`);
      toast.success("Comparison deleted.");
      if (result?.id === deleteTarget.id) setResult(null);
      fetchHistory();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to delete.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Compare Contracts
        </h2>
        <p className="text-sm text-muted-foreground">
          Select two completed contracts to compare them side by side.
        </p>
      </div>

      {/* Document selectors */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <DocumentSelector
              label="Document A"
              documents={documents}
              isLoading={docsLoading}
              selectedId={docAId}
              excludeId={docBId}
              onSelect={setDocAId}
            />
            <DocumentSelector
              label="Document B"
              documents={documents}
              isLoading={docsLoading}
              selectedId={docBId}
              excludeId={docAId}
              onSelect={setDocBId}
            />
          </div>

          <div className="mt-4 flex justify-center">
            <Button
              onClick={handleCompare}
              disabled={!docAId || !docBId || isComparing}
              size="lg"
            >
              {isComparing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <GitCompareArrows className="h-4 w-4" />
                  Compare Documents
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && <ContractDiffView comparison={result} />}

      {/* Empty state before first comparison */}
      {!result && !isComparing && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <GitCompareArrows className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Select two completed contracts above to compare them side by side.
          </p>
        </div>
      )}

      {/* Comparison History */}
      <div className="space-y-4">
        <Separator />
        <h3 className="text-lg font-semibold">Comparison History</h3>

        {historyLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No previous comparisons.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => handleLoadHistory(comp)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {comp.doc_a_filename}
                      <span className="text-muted-foreground mx-1.5">vs</span>
                      {comp.doc_b_filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(comp.created_at)}
                      {comp.diff_result?.summary && (
                        <span>
                          {" "}
                          &middot; {comp.diff_result.summary.matching} matching,{" "}
                          {comp.diff_result.summary.different} different
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(comp);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Comparison</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this comparison? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
