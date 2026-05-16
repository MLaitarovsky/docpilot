"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfidenceIndicator } from "@/components/confidence-indicator";
import { api, ApiError } from "@/lib/api-client";
import type { Extraction, ExtractedField } from "@/types/extraction";

interface ExtractionCardProps {
  extraction: Extraction;
  docType: string;
  documentId: string;
  onUpdate?: () => void;
}

const FIELD_GROUPS: Record<string, { label: string; fields: string[] }[]> = {
  nda: [
    {
      label: "Parties",
      fields: ["disclosing_party", "receiving_party", "governing_law"],
    },
    {
      label: "Dates & Duration",
      fields: ["effective_date", "expiration_date", "term_length"],
    },
    {
      label: "Key Terms",
      fields: [
        "confidentiality_scope",
        "permitted_disclosures",
        "return_of_materials",
      ],
    },
  ],
  service_agreement: [
    {
      label: "Parties",
      fields: ["client_name", "provider_name", "governing_law"],
    },
    {
      label: "Dates",
      fields: ["effective_date", "expiration_date", "renewal_terms"],
    },
    {
      label: "Financial Terms",
      fields: ["total_value", "payment_terms", "late_fee"],
    },
    {
      label: "Scope & Liability",
      fields: ["scope_of_services", "limitation_of_liability"],
    },
  ],
  employment_contract: [
    {
      label: "Parties",
      fields: ["employer_name", "employee_name", "job_title"],
    },
    {
      label: "Dates",
      fields: ["start_date", "end_date", "probation_period"],
    },
    {
      label: "Compensation",
      fields: ["salary", "bonus_structure", "benefits"],
    },
    {
      label: "Terms",
      fields: [
        "termination_notice_period",
        "non_compete_clause",
        "governing_law",
      ],
    },
  ],
};

function formatFieldLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(field: ExtractedField | undefined) {
  if (!field || field.value === null || field.value === undefined) {
    return <span className="text-sm italic text-muted-foreground">Not found</span>;
  }
  if (typeof field.value === "boolean") {
    return <span className="text-sm">{field.value ? "Yes" : "No"}</span>;
  }
  return <span className="text-sm">{String(field.value)}</span>;
}

interface FieldRowProps {
  label: string;
  fieldKey: string;
  field: ExtractedField | undefined;
  documentId: string;
  extractionId: string;
  onUpdate?: () => void;
}

function FieldRow({
  label,
  fieldKey,
  field,
  documentId,
  extractionId,
  onUpdate,
}: FieldRowProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const copyValue =
    field && field.value !== null && field.value !== undefined
      ? typeof field.value === "boolean"
        ? field.value
          ? "Yes"
          : "No"
        : String(field.value)
      : null;

  function handleCopy() {
    if (!copyValue) return;
    navigator.clipboard.writeText(copyValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function startEdit() {
    setDraft(copyValue ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft("");
  }

  async function saveEdit() {
    if (saving) return;
    setSaving(true);
    try {
      await api.patch(
        `/api/documents/${documentId}/extractions/${extractionId}`,
        { field_key: fieldKey, value: draft },
      );
      toast.success("Field updated.");
      setEditing(false);
      onUpdate?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update field.",
      );
    } finally {
      setSaving(false);
    }
  }

  const isUserEdited = field?.source === "user";

  return (
    <div className="group flex items-start justify-between gap-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {label}
          {isUserEdited && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Edited
            </span>
          )}
        </p>
        {editing ? (
          <div className="mt-1 flex items-center gap-2">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                else if (e.key === "Escape") cancelEdit();
              }}
              className="h-8 flex-1"
              disabled={saving}
            />
            <button
              onClick={saveEdit}
              disabled={saving}
              className="text-emerald-600 hover:text-emerald-700"
              aria-label="Save"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mt-0.5">{renderValue(field)}</div>
        )}
      </div>
      {!editing && (
        <div className="flex shrink-0 items-center gap-2 pt-4">
          {field && field.confidence !== undefined && (
            <ConfidenceIndicator confidence={field.confidence} />
          )}
          <button
            type="button"
            onClick={startEdit}
            className="opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 text-muted-foreground"
            title="Edit value"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {copyValue !== null && (
            <button
              type="button"
              onClick={handleCopy}
              className="opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 text-muted-foreground"
              title="Copy to clipboard"
              aria-label="Copy value"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ExtractionCard({
  extraction,
  docType,
  documentId,
  onUpdate,
}: ExtractionCardProps) {
  const data = extraction.extracted_data;
  const groups = FIELD_GROUPS[docType];

  if (groups) {
    return (
      <div className="space-y-6">
        {groups.map((group, idx) => {
          const hasAnyField = group.fields.some((f) => data[f]);
          if (!hasAnyField) return null;

          return (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{group.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {group.fields.map((fieldKey) => (
                    <FieldRow
                      key={fieldKey}
                      label={formatFieldLabel(fieldKey)}
                      fieldKey={fieldKey}
                      field={data[fieldKey]}
                      documentId={documentId}
                      extractionId={extraction.id}
                      onUpdate={onUpdate}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        <UngroupedFields
          data={data}
          groups={groups}
          documentId={documentId}
          extractionId={extraction.id}
          onUpdate={onUpdate}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Extracted Fields</CardTitle>
        <CardDescription>
          Model: {extraction.model_used} &middot; {extraction.processing_ms}ms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {Object.entries(data).map(([key, field]) => (
            <FieldRow
              key={key}
              label={formatFieldLabel(key)}
              fieldKey={key}
              field={field}
              documentId={documentId}
              extractionId={extraction.id}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface UngroupedFieldsProps {
  data: Record<string, ExtractedField>;
  groups: { label: string; fields: string[] }[];
  documentId: string;
  extractionId: string;
  onUpdate?: () => void;
}

function UngroupedFields({
  data,
  groups,
  documentId,
  extractionId,
  onUpdate,
}: UngroupedFieldsProps) {
  const groupedKeys = new Set(groups.flatMap((g) => g.fields));
  const ungrouped = Object.entries(data).filter(
    ([key]) => !groupedKeys.has(key),
  );

  if (ungrouped.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Other Fields</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {ungrouped.map(([key, field]) => (
            <FieldRow
              key={key}
              label={formatFieldLabel(key)}
              fieldKey={key}
              field={field}
              documentId={documentId}
              extractionId={extractionId}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
