"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { openOriginalPdf } from "@/lib/pdf";

interface DocumentEvidenceProps {
  rawText: string | null;
  documentId: string;
  /** The clause quote to locate and highlight, or null for none. */
  target: string | null;
  /** Short label for the highlighted clause (e.g. "Indemnification"). */
  targetLabel?: string | null;
  onClearTarget?: () => void;
  dir?: "ltr" | "rtl";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Locate `needle` inside `haystack`. LLM quotes are often truncated with
 * an ellipsis or lightly normalized, so we try progressively looser
 * strategies before giving up.
 */
function findMatch(haystack: string, needle: string): [number, number] | null {
  if (!needle) return null;

  const cleaned = needle
    .replace(/…|\.\.\./g, " ")
    .replace(/[“”„"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;

  const hayLower = haystack.toLowerCase();

  // 1. Exact / case-insensitive substring, longest prefix first.
  for (const len of [cleaned.length, 160, 100, 60, 40]) {
    const probe = cleaned.slice(0, len).trim();
    if (probe.length < 12) continue;
    const exact = haystack.indexOf(probe);
    if (exact !== -1) return [exact, exact + probe.length];
    const ci = hayLower.indexOf(probe.toLowerCase());
    if (ci !== -1) return [ci, ci + probe.length];
  }

  // 2. Whitespace-tolerant: match the first ~14 words with flexible gaps.
  const words = cleaned.split(" ").slice(0, 14).filter(Boolean);
  if (words.length >= 3) {
    try {
      const re = new RegExp(words.map(escapeRegExp).join("\\s+"), "i");
      const m = haystack.match(re);
      if (m && m.index != null) return [m.index, m.index + m[0].length];
    } catch {
      // malformed regex — ignore
    }
  }

  return null;
}

export function DocumentEvidence({
  rawText,
  documentId,
  target,
  targetLabel,
  onClearTarget,
  dir = "ltr",
}: DocumentEvidenceProps) {
  const markRef = useRef<HTMLElement | null>(null);
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);

  const segments = useMemo(() => {
    if (!rawText) return null;
    if (!target) return { before: rawText, match: "", after: "", found: false };

    const hit = findMatch(rawText, target);
    if (!hit) return { before: rawText, match: "", after: "", found: false };

    const [start, end] = hit;
    return {
      before: rawText.slice(0, start),
      match: rawText.slice(start, end),
      after: rawText.slice(end),
      found: true,
    };
  }, [rawText, target]);

  useEffect(() => {
    if (target && segments?.found && markRef.current) {
      markRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [target, segments]);

  async function handleOpenPdf() {
    setIsOpeningPdf(true);
    try {
      await openOriginalPdf(documentId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open the PDF.");
    } finally {
      setIsOpeningPdf(false);
    }
  }

  if (!rawText) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No document text available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-h-[28px] flex items-center">
          {target && segments?.found && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
              <MapPin className="h-3 w-3" />
              Showing: {targetLabel ?? "selected clause"}
              {onClearTarget && (
                <button
                  type="button"
                  onClick={onClearTarget}
                  className="ml-1 rounded hover:bg-amber-200"
                  aria-label="Clear highlight"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          )}
          {target && segments && !segments.found && (
            <span className="text-xs text-muted-foreground">
              Couldn&apos;t locate this passage automatically — the quote may
              be paraphrased. Showing the full document below.
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenPdf}
          disabled={isOpeningPdf}
          className="print:hidden shrink-0"
        >
          {isOpeningPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          Open original PDF
        </Button>
      </div>

      <pre
        className="max-h-[640px] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-xs leading-relaxed"
        dir={dir}
      >
        {segments && segments.match ? (
          <>
            {segments.before}
            <mark
              ref={markRef}
              className="rounded bg-amber-300 px-0.5 text-foreground"
            >
              {segments.match}
            </mark>
            {segments.after}
          </>
        ) : (
          rawText
        )}
      </pre>
    </div>
  );
}
