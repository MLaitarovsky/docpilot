"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import type { Document } from "@/types/document";

/**
 * Polls the documents list every 6 s and fires a toast whenever a document
 * transitions from processing/uploaded → completed or failed.
 * Renders nothing — purely a side-effect component.
 */
export function ProcessingNotifier() {
  const router = useRouter();
  const prevStatuses = useRef<Map<string, string>>(new Map());
  const initialized = useRef(false);

  useEffect(() => {
    async function poll() {
      try {
        const data = await api.get<{ documents: Document[]; total: number }>(
          "/api/documents?limit=50",
        );

        data.documents.forEach((doc) => {
          const prev = prevStatuses.current.get(doc.id);
          const wasProcessing = prev === "processing" || prev === "uploaded";

          if (initialized.current && wasProcessing) {
            if (doc.status === "completed") {
              toast.success(`"${doc.filename}" is ready`, {
                action: {
                  label: "View",
                  onClick: () => router.push(`/documents/${doc.id}`),
                },
              });
            } else if (doc.status === "failed") {
              toast.error(`"${doc.filename}" failed to process`);
            }
          }

          prevStatuses.current.set(doc.id, doc.status);
        });

        initialized.current = true;
      } catch {
        // silently ignore — don't spam errors for a background poller
      }
    }

    poll();
    const id = setInterval(poll, 6000);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
