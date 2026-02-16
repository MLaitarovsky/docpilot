"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, Upload, X } from "lucide-react";
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
  /** Called when the pipeline finishes and the user can view results. */
  onComplete?: () => void;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // After a successful upload, store the task/doc IDs to show progress
  const [taskId, setTaskId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const validateAndSelect = useCallback((file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are accepted.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("File exceeds 10 MB limit.");
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const data = await api.upload<UploadResponse>(
        "/api/documents/upload",
        formData,
      );
      setTaskId(data.task_id);
      setDocumentId(data.document.id);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Upload failed. Try again.";
      toast.error(msg);
      setIsUploading(false);
    }
  }, [selectedFile]);

  // ── If processing has started, show the progress view ──
  if (taskId && documentId) {
    return (
      <div>
        <ProcessingProgress jobId={taskId} documentId={documentId} />
        <div className="mt-2 text-center">
          <Button variant="ghost" size="sm" onClick={onComplete}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  // ── Dropzone view ──
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
            Drag &amp; drop your PDF here, or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF only, up to 10 MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatSize(selectedFile.size)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
        {isUploading ? (
          <>
            <Upload className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload Contract
          </>
        )}
      </Button>
    </div>
  );
}
