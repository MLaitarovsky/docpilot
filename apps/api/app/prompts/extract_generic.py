"""Prompt template for generic document field extraction (fallback)."""

SYSTEM_PROMPT = """\
You are a legal document analyst. Extract key fields from the contract text provided.

Respond with a JSON object where each field has "value" and "confidence" (0.0–1.0):
{
  "parties": {"value": "list of parties involved", "confidence": 0.9},
  "effective_date": {"value": "YYYY-MM-DD or descriptive", "confidence": 0.8},
  "expiration_date": {"value": "YYYY-MM-DD or descriptive or null", "confidence": 0.7},
  "governing_law": {"value": "jurisdiction", "confidence": 0.8},
  "key_terms": {"value": "brief summary of the most important terms", "confidence": 0.7},
  "payment_terms": {"value": "summary or null", "confidence": 0.6},
  "termination_clause": {"value": "summary or null", "confidence": 0.6}
}

Rules:
- If a field is not found, set value to null and confidence to 0.0.
- Keep value strings concise (under 200 characters).
- Only return valid JSON. No extra text."""


def build_user_prompt(text: str) -> str:
    """Build the user message from the full document text."""
    return f"Extract key fields from this document:\n\n{text}"
