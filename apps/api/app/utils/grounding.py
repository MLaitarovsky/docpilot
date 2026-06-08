"""Grounding guard — verify that an LLM-flagged clause is actually quoted from
the source contract, not hallucinated.

The model is instructed to quote verbatim, but instruction-following is not a
guarantee — especially on short contracts where it may "helpfully" invent
plausible-sounding clauses. A fabricated sentence shares no meaningful verbatim
span with the real document, so we can detect and drop it deterministically.

This is intentionally tolerant: PDF text extraction mangles whitespace and the
model may truncate a long quote with an ellipsis. We accept a clause if any
sufficiently long contiguous span of its quote appears in the document, or if a
run of its words appears in order. We only reject quotes that share essentially
nothing with the source.
"""

import re

# Straight + curly quotes, guillemets, and Hebrew geresh/gershayim.
_QUOTE_CHARS = "\"'“”‘’„‟«»´`׳״"

_WS_RE = re.compile(r"\s+")


def _normalize(text: str) -> str:
    """Collapse all whitespace to single spaces and lowercase (no-op for Hebrew)."""
    return _WS_RE.sub(" ", text).strip().lower()


def _clean_needle(quote: str) -> str:
    """Strip ellipses and surrounding quote characters the model tends to add."""
    cleaned = quote.replace("…", " ").replace("...", " ")
    cleaned = _WS_RE.sub(" ", cleaned).strip()
    cleaned = cleaned.strip(_QUOTE_CHARS).strip()
    return cleaned


def is_grounded_quote(
    haystack: str,
    quote: str,
    window: int = 40,
    min_len: int = 12,
) -> bool:
    """Return True if ``quote`` plausibly originates from ``haystack``.

    Args:
        haystack: The full source contract text.
        quote: The LLM's ``original_text`` for a flagged clause.
        window: Length of the contiguous span that must match for longer quotes.
        min_len: Below this length we require a full verbatim substring match.
    """
    if not haystack or not quote:
        return False

    hay = _normalize(haystack)
    needle = _normalize(_clean_needle(quote))
    if not needle:
        return False

    # Short quotes: demand an exact (whitespace-normalized) substring.
    if len(needle) <= min_len:
        return needle in hay

    # Whole quote present verbatim — the common, happy case.
    if needle in hay:
        return True

    # Sliding contiguous window: a real quote shares at least one ``window``-char
    # run with the source even if the model truncated or lightly edited the ends.
    win = min(window, len(needle))
    step = max(1, win // 2)
    for i in range(0, len(needle) - win + 1, step):
        if needle[i : i + win] in hay:
            return True

    # Last resort: the first several words appear in order, tolerant of differing
    # punctuation/whitespace between them. Requires enough words to be meaningful.
    words = [re.escape(w) for w in needle.split(" ") if w][:12]
    if len(words) >= 5:
        if re.search(r"\W*".join(words), hay):
            return True

    return False


if __name__ == "__main__":
    # Sanity check against the real hallucination the lawyer caught: a small
    # Hebrew windows-installation contract that never contained these clauses.
    contract = (
        "הסכם לביצוע עבודות אלומיניום בין הלקוח לבין הקבלן. "
        "הקבלן יספק ויתקין חלונות אלומיניום בדירה. "
        "התשלום יבוצע בשני תשלומים. תקופת האחריות היא שנה אחת."
    )
    invented = "אין הגבלה על אחריות הקבלן במקרה של נזק."
    real = "הקבלן יספק ויתקין חלונות אלומיניום"

    assert is_grounded_quote(contract, real) is True, "real quote should be grounded"
    assert is_grounded_quote(contract, invented) is False, "invented quote must drop"
    assert is_grounded_quote(contract, "") is False
    print("grounding self-test passed")
