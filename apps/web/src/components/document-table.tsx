"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, FileText, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskScoreBadge } from "@/components/risk-score-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api-client";
import type { Document } from "@/types/document";

interface DocumentTableProps {
  documents: Document[];
  isLoading: boolean;
  onRefetch: () => void;
  sortCol?: string | null;
  sortDir?: "asc" | "desc";
  onSort?: (col: string) => void;
}

// ── Badge colors ──

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
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(iso: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Skeleton loader ──

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-4" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-8" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Main component ──

function SortIcon({
  col,
  sortCol,
  sortDir,
}: {
  col: string;
  sortCol?: string | null;
  sortDir?: "asc" | "desc";
}) {
  if (sortCol !== col)
    return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
  return sortDir === "asc" ? (
    <ArrowUp className="ml-1 h-3 w-3" />
  ) : (
    <ArrowDown className="ml-1 h-3 w-3" />
  );
}

export function DocumentTable({
  documents,
  isLoading,
  onRefetch,
  sortCol,
  sortDir,
  onSort,
}: DocumentTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    const total = documents.length;
    const n = selectedIds.size;
    headerCheckboxRef.current.indeterminate = n > 0 && n < total;
  }, [selectedIds, documents.length]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/documents/${deleteTarget.id}`);
      toast.success("Document deleted.");
      onRefetch();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to delete document.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleBulkDelete() {
    setIsBulkDeleting(true);
    const count = selectedIds.size;
    try {
      await Promise.all(
        [...selectedIds].map((id) => api.delete(`/api/documents/${id}`)),
      );
      toast.success(`${count} document${count === 1 ? "" : "s"} deleted.`);
      setSelectedIds(new Set());
      onRefetch();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to delete documents.";
      toast.error(msg);
    } finally {
      setIsBulkDeleting(false);
      setShowBulkConfirm(false);
    }
  }

  const allChecked =
    documents.length > 0 && selectedIds.size === documents.length;

  // Empty state
  if (!isLoading && documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <FileText className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          No documents yet.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload your first contract to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size}{" "}
            {selectedIds.size === 1 ? "document" : "documents"} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkConfirm(true)}
            disabled={isBulkDeleting}
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded border-input accent-primary"
                checked={allChecked}
                onChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => onSort?.("filename")}
            >
              <div className="flex items-center">
                Filename
                <SortIcon col="filename" sortCol={sortCol} sortDir={sortDir} />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => onSort?.("doc_type")}
            >
              <div className="flex items-center">
                Type
                <SortIcon col="doc_type" sortCol={sortCol} sortDir={sortDir} />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => onSort?.("status")}
            >
              <div className="flex items-center">
                Status
                <SortIcon col="status" sortCol={sortCol} sortDir={sortDir} />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => onSort?.("risk_score")}
            >
              <div className="flex items-center">
                Risk
                <SortIcon col="risk_score" sortCol={sortCol} sortDir={sortDir} />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => onSort?.("page_count")}
            >
              <div className="flex items-center justify-end">
                Pages
                <SortIcon col="page_count" sortCol={sortCol} sortDir={sortDir} />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => onSort?.("created_at")}
            >
              <div className="flex items-center">
                Uploaded
                <SortIcon col="created_at" sortCol={sortCol} sortDir={sortDir} />
              </div>
            </TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonRows />
          ) : (
            documents.map((doc) => (
              <TableRow
                key={doc.id}
                className="cursor-pointer"
                onClick={() => router.push(`/documents/${doc.id}`)}
                data-state={selectedIds.has(doc.id) ? "selected" : undefined}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-input accent-primary"
                    checked={selectedIds.has(doc.id)}
                    onChange={() => toggleSelect(doc.id)}
                    aria-label={`Select ${doc.filename}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium max-w-[260px]">
                      {doc.filename}
                    </span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {formatSize(doc.file_size_bytes)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      DOC_TYPE_STYLES[doc.doc_type ?? "other"] ??
                      DOC_TYPE_STYLES.other
                    }
                  >
                    {formatDocType(doc.doc_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_STYLES[doc.status] ?? STATUS_STYLES.uploaded}>
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <RiskScoreBadge score={doc.risk_score ?? null} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {doc.page_count ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {timeAgo(doc.created_at)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/documents/${doc.id}`);
                        }}
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(doc);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.filename}
              &rdquo;? This action cannot be undone. All extractions and clause
              analysis will be permanently removed.
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

      {/* Bulk delete confirmation dialog */}
      <Dialog
        open={showBulkConfirm}
        onOpenChange={(open) => {
          if (!open && !isBulkDeleting) setShowBulkConfirm(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "Document" : "Documents"}
            </DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "document" : "documents"} along with
              all extractions and clause analysis. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkConfirm(false)}
              disabled={isBulkDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedIds.size}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
