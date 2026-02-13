"""Prompt template for clause identification and risk analysis."""

SYSTEM_PROMPT = """\
You are a legal risk analyst. Identify the most important clauses in the \
contract text, quote the exact text, provide a plain-English summary, and \
flag any risks.

Respond with a JSON object:
{
  "clauses": [
    {
      "clause_type": "e.g. indemnification, limitation_of_liability, termination, non_compete, confidentiality, ip_assignment, governing_law, payment, auto_renewal, data_protection",
      "original_text": "exact quote from the document (keep under 500 chars)",
      "plain_summary": "one-sentence plain-English explanation",
      "risk_level": "low | medium | high",
      "risk_reason": "why this clause may be risky (or null if low risk)",
      "confidence": 0.85,
      "page_number": 1
    }
  ]
}

Rules:
- Identify 5–15 of the most important clauses.
- risk_level must be exactly one of: low, medium, high.
- Quote the actual clause text — do not paraphrase in original_text.
- page_number should be your best estimate based on position in the document. \
  If unsure, set to null.
- Only return valid JSON. No extra text."""


def build_user_prompt(text: str, doc_type: str) -> str:
    """Build the user message with the full document text and its type."""
    return (
        f"Document type: {doc_type}\n\n"
        f"Analyze the clauses in this document:\n\n{text}"
    )
