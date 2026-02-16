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
}

export interface Clause {
  id: string;
  document_id: string;
  clause_type: string;
  original_text: string;
  plain_summary: string;
  risk_level: "low" | "medium" | "high";
  risk_reason: string;
  confidence: number;
  page_number: number | null;
}

export interface JobProgress {
  step: number;
  total_steps: number;
  message: string;
  progress: number;
  status?: "processing" | "completed" | "failed";
}
