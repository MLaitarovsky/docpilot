export interface Extraction {
  id: string;
  document_id: string;
  extracted_data: Record<string, ExtractedField>;
  model_used: string;
  processing_ms: number;
  created_at: string;
}

export interface ExtractedField {
  value: string | number | boolean | null;
  confidence: number;
  source?: "model" | "user";
}

export interface Annotation {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface Clause {
  id: string;
  document_id: string;
  clause_type: string;
  original_text: string;
  plain_summary: string;
  risk_level: "low" | "medium" | "high";
  risk_reason: string;
  suggested_alternative: string | null;
  unfavorable_to: string | null;
  confidence: number;
  page_number: number | null;
  annotations?: Annotation[];
}

export interface JobProgress {
  step: number;
  total_steps: number;
  message: string;
  progress: number;
  status?: "processing" | "completed" | "failed";
}
