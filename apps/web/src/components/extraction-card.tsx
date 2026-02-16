"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfidenceIndicator } from "@/components/confidence-indicator";
import type { Extraction, ExtractedField } from "@/types/extraction";

interface ExtractionCardProps {
  extraction: Extraction;
  docType: string;
}

/** Groupings by doc type for a cleaner layout. */
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
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(field: ExtractedField | undefined) {
  if (!field || field.value === null || field.value === undefined) {
    return <span className="text-sm text-muted-foreground italic">Not found</span>;
  }
  if (typeof field.value === "boolean") {
    return <span className="text-sm">{field.value ? "Yes" : "No"}</span>;
  }
  return <span className="text-sm">{String(field.value)}</span>;
}

function FieldRow({
  label,
  field,
}: {
  label: string;
  field: ExtractedField | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-0.5">{renderValue(field)}</div>
      </div>
      {field && field.confidence !== undefined && (
        <div className="shrink-0 pt-4">
          <ConfidenceIndicator confidence={field.confidence} />
        </div>
      )}
    </div>
  );
}

export function ExtractionCard({ extraction, docType }: ExtractionCardProps) {
  const data = extraction.extracted_data;
  const groups = FIELD_GROUPS[docType];

  // If we have predefined groups for this doc type, render grouped
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
                      field={data[fieldKey]}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Render any fields not in a known group */}
        <UngroupedFields data={data} groups={groups} />
      </div>
    );
  }

  // Generic fallback: render all fields in a single card
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
              field={field}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UngroupedFields({
  data,
  groups,
}: {
  data: Record<string, ExtractedField>;
  groups: { label: string; fields: string[] }[];
}) {
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
            <FieldRow key={key} label={formatFieldLabel(key)} field={field} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
