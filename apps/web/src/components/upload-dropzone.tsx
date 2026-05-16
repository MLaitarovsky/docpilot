"use client";

import { useCallback, useRef, useState } from "react";
import { Check, FileUp, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ProcessingProgress } from "@/components/processing-progress";
import { api, ApiError } from "@/lib/api-client";
import type { Document } from "@/types/document";

interface UploadResponse {
  document: Document;
  task_id: string;
}

interface UploadDropzoneProps {
  /** Called when the upload(s) complete and the user can view results. */
  onComplete?: () => void;
}

interface QueueItem {
  file: File;
  status: "pending" | "uploading" | "done" | "failed";
  taskId?: string;
  documentId?: string;
  error?: string;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDropzone({ onComplete }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Single-file processing view (shows live SSE for the most recent upload)
  const [activeJob, setActiveJob] = useState<{
    taskId: string;
    documentId: string;
  } | null>(null);

  const validateAndAdd = useCallback((files: File[]) => {
    const valid: QueueItem[] = [];
    for (const file of files) {
      if (file.type !== "application/pdf") {
        toast.error(`${file.name}: only PDF files are accepted.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name}: exceeds 10 MB limit.`);
        continue;
      }
      valid.push({ file, status: "pending" });
    }
    if (valid.length > 0) {
      setQueue((prev) => [...prev, ...valid]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) validateAndAdd(files);
    },
    [validateAndAdd],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) validateAndAdd(files);
      if (inputRef.current) inputRef.current.value = "";
    },
    [validateAndAdd],
  );

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUploadAll = useCallback(async () => {
    if (queue.length === 0) return;
    setIsUploading(true);

    let lastJob: { taskId: string; documentId: string } | null = null;
    let successCount = 0;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === "done") continue;

      setQueue((prev) =>
        prev.map((q, idx) => (idx === i ? { ...q, status: "uploading" } : q)),
      );

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        const data = await api.upload<UploadResponse>(
          "/api/documents/upload",
          formData,
        );
        successCount++;
        lastJob = { taskId: data.task_id, documentId: data.document.id };
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  status: "done",
                  taskId: data.task_id,
                  documentId: data.document.id,
                }
              : q,
          ),
        );
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Upload failed.";
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: "failed", error: msg } : q,
          ),
        );
      }
    }

    setIsUploading(false);
    if (successCount > 1) {
      toast.success(
        `Queued ${successCount} contracts for processing. Watch the Documents page.`,
      );
      // For multi-file uploads, just close the dialog and let the dashboard
      // refetch — the per-file SSE view doesn't make sense.
      onComplete?.();
    } else if (successCount === 1 && lastJob) {
      // Single-file: show live progress
      setActiveJob(lastJob);
    }
  }, [queue, onComplete]);

  // ── Single-file live progress view ──
  if (activeJob) {
    return (
      <div>
        <ProcessingProgress
          jobId={activeJob.taskId}
          documentId={activeJob.documentId}
        />
        <div className="mt-2 text-center">
          <Button variant="ghost" size="sm" onClick={onComplete}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  // ── Dropzone + queue ──
  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileUp className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            Drag &amp; drop PDFs here, or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF only, up to 10 MB each. Multiple files supported.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item, idx) => (
            <div
              key={`${item.file.name}-${idx}`}
              className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                {item.status === "uploading" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />
                ) : item.status === "done" ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : item.status === "failed" ? (
                  <X className="h-4 w-4 shrink-0 text-red-500" />
                ) : (
                  <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(item.file.size)}
                    {item.error && ` · ${item.error}`}
                  </p>
                </div>
              </div>
              {item.status === "pending" && !isUploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromQueue(idx);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={handleUploadAll}
        disabled={queue.length === 0 || isUploading || queue.every((q) => q.status === "done")}
      >
        {isUploading ? (
          <>
            <Upload className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload {queue.length > 0 ? `(${queue.filter((q) => q.status !== "done").length})` : ""}
          </>
        )}
      </Button>
    </div>
  );
}
