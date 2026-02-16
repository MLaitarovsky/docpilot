"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Plus,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadDropzone } from "@/components/upload-dropzone";
import { useDocuments } from "@/hooks/use-documents";
import type { Document } from "@/types/document";

// ── Helpers ──

const STATUS_STYLES: Record<string, string> = {
  uploaded: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
  processing:
    "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 animate-pulse",
  completed:
    "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  failed: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
};

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
  });
}

// ── Stat card ──

function StatCard({
  label,
  value,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-7 w-10" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──

export default function DashboardPage() {
  const { documents, isLoading, refetch } = useDocuments({ limit: 100 });
  const [dialogOpen, setDialogOpen] = useState(false);

  const counts = documents.reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const recent = documents.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Your AI-powered contract review overview.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Quick Upload
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
            <UploadDropzone
              onComplete={() => {
                setDialogOpen(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Documents"
          value={documents.length}
          icon={FileText}
          isLoading={isLoading}
        />
        <StatCard
          label="Completed"
          value={counts.completed ?? 0}
          icon={CheckCircle2}
          isLoading={isLoading}
        />
        <StatCard
          label="Processing"
          value={(counts.processing ?? 0) + (counts.uploaded ?? 0)}
          icon={Loader2}
          isLoading={isLoading}
        />
        <StatCard
          label="Failed"
          value={counts.failed ?? 0}
          icon={XCircle}
          isLoading={isLoading}
        />
      </div>

      {/* Recent documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Recent Documents</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/documents">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="ml-auto h-5 w-16" />
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No documents yet. Upload your first contract to get started.
            </p>
          ) : (
            <div className="space-y-1">
              {recent.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {doc.filename}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(doc.created_at)}
                  </span>
                  <Badge
                    className={`shrink-0 ${STATUS_STYLES[doc.status] ?? STATUS_STYLES.uploaded}`}
                  >
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
