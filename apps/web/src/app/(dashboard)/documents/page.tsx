"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DocumentTable } from "@/components/document-table";
import { UploadDropzone } from "@/components/upload-dropzone";
import { useDocuments } from "@/hooks/use-documents";
import type { Document } from "@/types/document";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "processing", label: "Processing" },
  { value: "uploaded", label: "Uploaded" },
  { value: "failed", label: "Failed" },
];

const DOC_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "nda", label: "NDA" },
  { value: "service_agreement", label: "Service Agreement" },
  { value: "employment_contract", label: "Employment Contract" },
  { value: "lease", label: "Lease" },
  { value: "saas_terms", label: "SaaS Terms" },
  { value: "other", label: "Other" },
];

const RISK_OPTIONS = [
  { value: "", label: "All Risks" },
  { value: "red", label: "High Risk" },
  { value: "amber", label: "Medium Risk" },
  { value: "green", label: "Low Risk" },
];

const RISK_ORDER: Record<string, number> = { red: 0, amber: 1, green: 2 };

type SortCol =
  | "filename"
  | "doc_type"
  | "status"
  | "risk_score"
  | "page_count"
  | "created_at";
type SortDir = "asc" | "desc";

function getSortValue(doc: Document, col: SortCol): string | number {
  switch (col) {
    case "filename":
      return doc.filename.toLowerCase();
    case "doc_type":
      return doc.doc_type ?? "";
    case "status":
      return doc.status;
    case "risk_score":
      return doc.risk_score != null ? (RISK_ORDER[doc.risk_score] ?? 3) : 3;
    case "page_count":
      return doc.page_count ?? -1;
    case "created_at":
      return doc.created_at;
  }
}

export default function DocumentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("");
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Debounce the search query to avoid hammering the API on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 350);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const {
    documents,
    total,
    offset,
    limit,
    isLoading,
    refetch,
    nextPage,
    prevPage,
    hasNext,
    hasPrev,
  } = useDocuments({
    status: statusFilter || null,
    docType: docTypeFilter || null,
    q: debouncedQuery || null,
  });

  const displayedDocuments = useMemo(() => {
    let result = [...documents];

    if (riskFilter) {
      result = result.filter((d) => d.risk_score === riskFilter);
    }

    if (sortCol) {
      result.sort((a, b) => {
        const av = getSortValue(a, sortCol);
        const bv = getSortValue(b, sortCol);
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [documents, riskFilter, sortCol, sortDir]);

  function handleSort(col: string) {
    const typedCol = col as SortCol;
    if (sortCol === typedCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(typedCol);
      setSortDir("asc");
    }
  }

  function handleUploadComplete() {
    setDialogOpen(false);
    refetch();
  }

  const showingFrom = total === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + limit, total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Upload and manage your contracts.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Upload Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Contract</DialogTitle>
              <DialogDescription>
                Upload a PDF contract for AI-powered extraction and risk
                analysis.
              </DialogDescription>
            </DialogHeader>
            <UploadDropzone onComplete={handleUploadComplete} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-9 w-72 pl-8"
            placeholder="Search filename or contract content…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={docTypeFilter}
          onChange={(e) => setDocTypeFilter(e.target.value)}
        >
          {DOC_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
        >
          {RISK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Document table */}
      <DocumentTable
        documents={displayedDocuments}
        isLoading={isLoading}
        onRefetch={refetch}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
      />

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {showingFrom}&ndash;{showingTo} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={!hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={!hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
