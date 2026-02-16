"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useJobProgress } from "@/hooks/use-sse";

interface ProcessingProgressProps {
  jobId: string;
  documentId: string;
}

export function ProcessingProgress({
  jobId,
  documentId,
}: ProcessingProgressProps) {
  const { progress } = useJobProgress(jobId);

  const step = progress?.step ?? 0;
  const totalSteps = progress?.total_steps ?? 5;
  const message = progress?.message ?? "Starting pipeline...";
  const pct = progress?.progress ?? 0;
  const status = progress?.status ?? "processing";

  if (status === "completed") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-emerald-700">Processing Complete</p>
          <p className="mt-1 text-sm text-muted-foreground">
            All {totalSteps} steps finished successfully.
          </p>
        </div>
        <Button asChild>
          <Link href={`/documents/${documentId}`}>View Results</Link>
        </Button>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-7 w-7 text-red-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-red-700">Processing Failed</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm font-medium">
          Step {step}/{totalSteps} &mdash; {message}
        </p>
      </div>
      <Progress value={Math.max(pct, 0)} className="h-2" />
      <p className="text-xs text-muted-foreground">{pct}% complete</p>
    </div>
  );
}
