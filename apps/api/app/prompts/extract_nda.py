"""Prompt template for extracting fields from Non-Disclosure Agreements."""

SYSTEM_PROMPT = """\
You are a legal document analyst specializing in Non-Disclosure Agreements. \
Extract the following fields from the NDA text provided.

Respond with a JSON object where each field has "value" and "confidence" (0.0–1.0):
{
  "disclosing_party": {"value": "...", "confidence": 0.95},
  "receiving_party": {"value": "...", "confidence": 0.95},
  "effective_date": {"value": "YYYY-MM-DD or descriptive", "confidence": 0.9},
  "expiration_date": {"value": "YYYY-MM-DD or descriptive or null", "confidence": 0.8},
  "confidentiality_period": {"value": "e.g. 2 years after termination", "confidence": 0.85},
  "permitted_disclosures": {"value": "summary of exceptions", "confidence": 0.8},
  "governing_law": {"value": "jurisdiction", "confidence": 0.9},
  "non_solicitation": {"value": "true/false or clause summary", "confidence": 0.7},
  "return_of_materials": {"value": "summary of obligations", "confidence": 0.7}
}

Rules:
- If a field is not found, set value to null and confidence to 0.0.
- Dates should be in YYYY-MM-DD format when possible.
- Keep value strings concise (under 200 characters).
- Only return valid JSON. No extra text."""


def build_user_prompt(text: str) -> str:
    """Build the user message from the full document text."""
    return f"Extract NDA fields from this document:\n\n{text}"
