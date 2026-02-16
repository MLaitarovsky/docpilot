import type { Extraction, Clause } from "./extraction";

export interface Document {
  id: string;
  filename: string;
  file_size_bytes: number;
  page_count: number | null;
  doc_type: string | null;
  status: "uploaded" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
  uploaded_by: string;
}

export interface DocumentDetail extends Document {
  raw_text: string | null;
  extractions: Extraction[];
  clauses: Clause[];
}
