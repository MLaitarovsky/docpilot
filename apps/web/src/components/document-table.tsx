"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
            <Skeleton className="h-4 w-40" />
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

export function DocumentTable({
  documents,
  isLoading,
  onRefetch,
}: DocumentTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Pages</TableHead>
            <TableHead>Uploaded</TableHead>
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
              >
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
    </>
  );
}
