export interface FieldDiffEntry {
  status: "match" | "different" | "only_in_a" | "only_in_b";
  value?: string | null;
  doc_a?: string | null;
  doc_b?: string | null;
}

export interface FieldDiff {
  [key: string]: FieldDiffEntry;
}

export interface ClauseDiffItem {
  clause_type: string;
  risk_a?: string | null;
  risk_b?: string | null;
  summary_a?: string | null;
  summary_b?: string | null;
}

export interface ComparisonResult {
  id: string;
  doc_a_id: string;
  doc_b_id: string;
  doc_a_filename: string;
  doc_b_filename: string;
  diff_result: {
    field_diff: FieldDiff;
    clause_diff: {
      only_in_a: string[];
      only_in_b: string[];
      shared: ClauseDiffItem[];
    };
    summary: {
      total_fields: number;
      matching: number;
      different: number;
      only_in_a: number;
      only_in_b: number;
    };
  };
  created_at: string;
}
