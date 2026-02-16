"use client";

import { useEffect, useRef, useState } from "react";
import type { JobProgress } from "@/types/extraction";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

/**
 * Subscribe to pipeline progress for a Celery job via SSE.
 *
 * Connects to GET /api/jobs/{jobId}/status using the EventSource API.
 * Auto-closes when progress reaches 100 (success) or -1 (failure).
 */
export function useJobProgress(jobId: string | null) {
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const url = `${API_URL}/api/jobs/${jobId}/status`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => {
      setIsConnected(true);
    };

    source.onmessage = (event) => {
      try {
        const data: JobProgress = JSON.parse(event.data);

        // Derive a status field for convenience
        if (data.progress === 100) {
          data.status = "completed";
        } else if (data.progress === -1) {
          data.status = "failed";
        } else {
          data.status = "processing";
        }

        setProgress(data);

        // Close the connection when terminal
        if (data.progress === 100 || data.progress === -1) {
          source.close();
          setIsConnected(false);
        }
      } catch {
        // Ignore parse errors (e.g. heartbeat comments)
      }
    };

    source.onerror = () => {
      source.close();
      setIsConnected(false);
    };

    return () => {
      source.close();
      setIsConnected(false);
      sourceRef.current = null;
    };
  }, [jobId]);

  return { progress, isConnected };
}
