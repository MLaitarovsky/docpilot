"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DocumentTable } from "@/components/document-table";
import { UploadDropzone } from "@/components/upload-dropzone";
import { useDocuments } from "@/hooks/use-documents";

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

export default function DocumentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("");

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
  });

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
      <div className="flex items-center gap-3">
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
      </div>

      {/* Document table */}
      <DocumentTable
        documents={documents}
        isLoading={isLoading}
        onRefetch={refetch}
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
