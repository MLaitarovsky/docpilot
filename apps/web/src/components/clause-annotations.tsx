"use client";

import { useState } from "react";
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import type { Annotation } from "@/types/extraction";

interface ClauseAnnotationsProps {
  clauseId: string;
  initialAnnotations: Annotation[];
  currentUserId: string | null;
  currentUserRole?: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ClauseAnnotations({
  clauseId,
  initialAnnotations,
  currentUserId,
  currentUserRole,
}: ClauseAnnotationsProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!draft.trim() || adding) return;
    setAdding(true);
    try {
      const created = await api.post<Annotation>(
        `/api/clauses/${clauseId}/annotations`,
        { content: draft.trim() },
      );
      setAnnotations((prev) => [...prev, created]);
      setDraft("");
      setShowForm(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to add note.",
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/api/clauses/annotations/${id}`);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to delete note.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function canDelete(authorId: string) {
    return (
      authorId === currentUserId ||
      currentUserRole === "owner" ||
      currentUserRole === "admin"
    );
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Notes ({annotations.length})
        </p>
        {!showForm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowForm(true)}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Add note
          </Button>
        )}
      </div>

      {annotations.length > 0 && (
        <div className="mt-2 space-y-2">
          {annotations.map((a) => (
            <div
              key={a.id}
              className="rounded border bg-background p-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{a.user_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(a.created_at)}
                  </span>
                  {canDelete(a.user_id) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      className="text-muted-foreground hover:text-red-500"
                      aria-label="Delete note"
                    >
                      {deletingId === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{a.content}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="mt-2 space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note for your team…"
            rows={3}
            className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setDraft("");
              }}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={!draft.trim() || adding}
            >
              {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
