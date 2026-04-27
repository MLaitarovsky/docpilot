"""ExtractionPipeline — runs all 5 steps of the AI document processing pipeline.

Steps:
  1. Extract text from PDF  (pdf_parser)
  2. Chunk text              (chunker)
  3. Classify document type  (LLM call #1)
  4. Extract fields          (LLM call #2, prompt selected by doc_type)
  5. Analyze clauses         (LLM call #3)

Each step publishes progress to Redis so the SSE endpoint can stream updates.
"""

import logging
import time
import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.clause import Clause
from app.models.document import Document
from app.models.extraction import Extraction
from app.prompts import (
    analyze_clauses,
    classify,
    extract_employment,
    extract_generic,
    extract_nda,
    extract_service_agreement,
)
from app.services.redis_client import publish_job_status
from app.utils.chunker import chunk_text
from app.utils.llm_client import call_llm
from app.utils.pdf_parser import extract_text_from_pdf

logger = logging.getLogger(__name__)

TOTAL_STEPS = 5

# Map doc_type → (system_prompt, user_prompt_builder)
EXTRACTION_PROMPTS: dict[str, tuple] = {
    "nda": (extract_nda.SYSTEM_PROMPT, extract_nda.build_user_prompt),
    "service_agreement": (
        extract_service_agreement.SYSTEM_PROMPT,
        extract_service_agreement.build_user_prompt,
    ),
    "employment_contract": (
        extract_employment.SYSTEM_PROMPT,
        extract_employment.build_user_prompt,
    ),
}

VALID_DOC_TYPES = {
    "nda",
    "service_agreement",
    "employment_contract",
    "lease",
    "saas_terms",
    "other",
}


class ExtractionPipeline:
    """Orchestrates the full document processing pipeline."""

    def __init__(self, document_id: str, job_id: str, db: Session):
        self.document_id = uuid.UUID(document_id)
        self.job_id = job_id
        self.db = db

        # Populated during the run
        self.document: Document | None = None
        self.full_text: str = ""
        self.page_map: list[dict] = []
        self.chunks: list[dict] = []
        self.doc_type: str = "other"
        self.detected_language: str = "en"

    def _publish(self, step: int, message: str, progress: int) -> None:
        """Publish a progress update to Redis."""
        publish_job_status(
            self.job_id,
            {
                "step": step,
                "total_steps": TOTAL_STEPS,
                "message": message,
                "progress": progress,
            },
        )

    def run(self) -> None:
        """Execute all pipeline steps in sequence."""
        # Load the document record
        self.document = self.db.execute(
            select(Document).where(Document.id == self.document_id)
        ).scalar_one_or_none()

        if self.document is None:
            raise ValueError(f"Document {self.document_id} not found")

        self.document.status = "processing"
        self.db.commit()

        self._step1_extract_text()
        self._step2_chunk_text()
        self._step3_classify()
        self._step4_extract_fields()
        self._step5_analyze_clauses()

        # Mark complete
        self.document.status = "completed"
        self.db.commit()

        self._publish(TOTAL_STEPS, "Processing complete", 100)

    # ── Step 1: Extract text from PDF ──────────────────

    def _step1_extract_text(self) -> None:
        self._publish(1, "Extracting text from PDF...", 10)

        if self.document.raw_text:
            # Text was pre-extracted by the API on upload.  In production the
            # API and Worker run in separate containers that don't share a
            # filesystem, so we read from the database instead of the file.
            logger.info(
                "Step 1/5 — Using pre-extracted text (%d chars)",
                len(self.document.raw_text),
            )
            self.full_text = self.document.raw_text
            # Build a synthetic page_map so the rest of the pipeline works.
            # Page numbers on clauses will all be 1, which is acceptable.
            self.page_map = [
                {
                    "page": 1,
                    "start_char": 0,
                    "end_char": len(self.full_text),
                    "text": self.full_text,
                }
            ]
            return

        # Fallback: extract from file directly (local dev with shared filesystem).
        logger.info("Step 1/5 — Extracting text from %s", self.document.file_path)
        self.full_text, self.page_map = extract_text_from_pdf(self.document.file_path)

        self.document.raw_text = self.full_text
        self.document.page_count = len(self.page_map)
        self.db.commit()

        logger.info(
            "Extracted %d chars across %d pages",
            len(self.full_text),
            len(self.page_map),
        )

    # ── Step 2: Chunk text ─────────────────────────────

    def _step2_chunk_text(self) -> None:
        self._publish(2, "Chunking text...", 20)
        logger.info("Step 2/5 — Chunking text")

        self.chunks = chunk_text(self.full_text, self.page_map)
        logger.info("Created %d chunks", len(self.chunks))

    # ── Step 3: Classify document type ─────────────────

    def _step3_classify(self) -> None:
        self._publish(3, "Classifying document type...", 35)
        logger.info("Step 3/5 — Classifying document")

        # Use the first 3 chunks (or all if fewer) for classification
        sample_text = "\n\n".join(c["text"] for c in self.chunks[:3])
        user_prompt = classify.build_user_prompt(sample_text)

        result = call_llm(classify.SYSTEM_PROMPT, user_prompt)

        raw_type = result.get("doc_type", "other")
        self.doc_type = raw_type if raw_type in VALID_DOC_TYPES else "other"

        lang = result.get("detected_language", "en") or "en"
        self.detected_language = lang[:10]  # guard against malformed responses

        self.document.doc_type = self.doc_type
        self.document.detected_language = self.detected_language
        self.db.commit()

        logger.info(
            "Classified as '%s' (confidence: %s, language: %s)",
            self.doc_type,
            result.get("confidence"),
            self.detected_language,
        )

    # ── Step 4: Extract fields based on doc_type ───────

    def _step4_extract_fields(self) -> None:
        self._publish(4, f"Extracting fields ({self.doc_type})...", 55)
        logger.info("Step 4/5 — Extracting fields for doc_type=%s", self.doc_type)

        # Select the right prompt — fall back to generic
        if self.doc_type in EXTRACTION_PROMPTS:
            system_prompt, build_user = EXTRACTION_PROMPTS[self.doc_type]
        else:
            system_prompt = extract_generic.SYSTEM_PROMPT
            build_user = extract_generic.build_user_prompt

        # Combine all chunks into one prompt (truncate to ~12k chars to stay
        # within context limits for smaller models)
        combined_text = "\n\n".join(c["text"] for c in self.chunks)[:12000]
        user_prompt = build_user(combined_text)

        start_ms = time.time()
        extracted_data = call_llm(system_prompt, user_prompt)
        elapsed_ms = int((time.time() - start_ms) * 1000)

        # Save to the extractions table
        extraction = Extraction(
            document_id=self.document_id,
            extracted_data=extracted_data,
            model_used=settings.llm_model,
            processing_ms=elapsed_ms,
        )
        self.db.add(extraction)
        self.db.commit()

        logger.info("Extracted %d fields in %dms", len(extracted_data), elapsed_ms)

    # ── Step 5: Analyze clauses ────────────────────────

    def _step5_analyze_clauses(self) -> None:
        self._publish(5, "Analyzing clauses for risks...", 75)
        logger.info("Step 5/5 — Analyzing clauses")

        combined_text = "\n\n".join(c["text"] for c in self.chunks)[:12000]
        user_prompt = analyze_clauses.build_user_prompt(
            combined_text, self.doc_type, self.detected_language
        )

        result = call_llm(analyze_clauses.SYSTEM_PROMPT, user_prompt)

        # Store document-level enrichment
        self.document.executive_summary = result.get("executive_summary")
        self.document.risk_score = result.get("risk_score")
        missing = result.get("missing_clauses")
        self.document.missing_clauses = missing if isinstance(missing, list) else []

        clauses_data = result.get("clauses", [])
        for item in clauses_data:
            confidence_raw = item.get("confidence")
            confidence = None
            if confidence_raw is not None:
                try:
                    confidence = Decimal(str(confidence_raw)).quantize(Decimal("0.01"))
                except Exception:
                    confidence = None

            clause = Clause(
                document_id=self.document_id,
                clause_type=item.get("clause_type", "unknown"),
                original_text=item.get("original_text", ""),
                plain_summary=item.get("plain_summary"),
                risk_level=item.get("risk_level"),
                risk_reason=item.get("risk_reason"),
                suggested_alternative=item.get("suggested_alternative"),
                unfavorable_to=item.get("unfavorable_to"),
                confidence=confidence,
                page_number=item.get("page_number"),
            )
            self.db.add(clause)

        self.db.commit()
        logger.info("Saved %d clauses (risk_score=%s)", len(clauses_data), self.document.risk_score)
