"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Document, DocumentDetail } from "@/types/document";

interface DocumentListResponse {
  documents: Document[];
  total: number;
  limit: number;
  offset: number;
}

interface UseDocumentsOptions {
  limit?: number;
  status?: string | null;
  docType?: string | null;
}

/**
 * Fetch the current team's document list with pagination and filters.
 */
export function useDocuments(options: UseDocumentsOptions = {}) {
  const { limit = 20, status = null, docType = null } = options;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageOffset: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        params.set("offset", String(pageOffset));
        if (status) params.set("status", status);
        if (docType) params.set("doc_type", docType);

        const data = await api.get<DocumentListResponse>(
          `/api/documents?${params.toString()}`,
        );
        setDocuments(data.documents);
        setTotal(data.total);
        setOffset(pageOffset);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load documents",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [limit, status, docType],
  );

  // Reset to first page when filters change
  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  function nextPage() {
    if (offset + limit < total) {
      fetchPage(offset + limit);
    }
  }

  function prevPage() {
    if (offset > 0) {
      fetchPage(Math.max(0, offset - limit));
    }
  }

  function refetch() {
    fetchPage(offset);
  }

  return {
    documents,
    total,
    offset,
    limit,
    isLoading,
    error,
    refetch,
    nextPage,
    prevPage,
    hasNext: offset + limit < total,
    hasPrev: offset > 0,
  };
}

/**
 * Fetch a single document with its extractions and clauses.
 */
export function useDocument(id: string) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<DocumentDetail>(`/api/documents/${id}`);
      setDocument(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load document",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { document, isLoading, error, refetch };
}
