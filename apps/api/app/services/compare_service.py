"""Compare two document extractions field by field and clause by clause."""

from typing import Any


def compare_extractions(
    extraction_a: dict[str, Any],
    extraction_b: dict[str, Any],
) -> dict[str, Any]:
    """Compare extracted_data JSONB from two documents.

    Returns a diff object with field_diff, clause_diff, and summary.
    """
    all_keys = set(extraction_a.keys()) | set(extraction_b.keys())

    field_diff: dict[str, Any] = {}
    matching = 0
    different = 0
    only_a = 0
    only_b = 0

    for key in sorted(all_keys):
        in_a = key in extraction_a
        in_b = key in extraction_b

        if in_a and in_b:
            val_a = _extract_value(extraction_a[key])
            val_b = _extract_value(extraction_b[key])

            if _values_equal(val_a, val_b):
                field_diff[key] = {"status": "match", "value": val_a}
                matching += 1
            else:
                field_diff[key] = {
                    "status": "different",
                    "doc_a": val_a,
                    "doc_b": val_b,
                }
                different += 1
        elif in_a:
            field_diff[key] = {
                "status": "only_in_a",
                "doc_a": _extract_value(extraction_a[key]),
            }
            only_a += 1
        else:
            field_diff[key] = {
                "status": "only_in_b",
                "doc_b": _extract_value(extraction_b[key]),
            }
            only_b += 1

    return {
        "field_diff": field_diff,
        "summary": {
            "total_fields": len(all_keys),
            "matching": matching,
            "different": different,
            "only_in_a": only_a,
            "only_in_b": only_b,
        },
    }


def compare_clauses(
    clauses_a: list[dict[str, Any]],
    clauses_b: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compare clauses from two documents by clause_type."""
    map_a: dict[str, dict] = {}
    for c in clauses_a:
        ct = c.get("clause_type", "unknown")
        map_a[ct] = c

    map_b: dict[str, dict] = {}
    for c in clauses_b:
        ct = c.get("clause_type", "unknown")
        map_b[ct] = c

    all_types = set(map_a.keys()) | set(map_b.keys())

    shared = []
    only_in_a = []
    only_in_b = []

    for ct in sorted(all_types):
        in_a = ct in map_a
        in_b = ct in map_b

        if in_a and in_b:
            shared.append(
                {
                    "clause_type": ct,
                    "risk_a": map_a[ct].get("risk_level"),
                    "risk_b": map_b[ct].get("risk_level"),
                    "summary_a": map_a[ct].get("plain_summary"),
                    "summary_b": map_b[ct].get("plain_summary"),
                }
            )
        elif in_a:
            only_in_a.append(ct)
        else:
            only_in_b.append(ct)

    return {
        "shared": shared,
        "only_in_a": only_in_a,
        "only_in_b": only_in_b,
    }


def _extract_value(field: Any) -> str | None:
    """Pull the displayable value from an extracted field.

    The extraction pipeline stores fields as {"value": ..., "confidence": ...}
    or sometimes as plain scalars.
    """
    if isinstance(field, dict):
        return str(field.get("value")) if field.get("value") is not None else None
    if field is None:
        return None
    return str(field)


def _values_equal(a: str | None, b: str | None) -> bool:
    """Case-insensitive comparison, treating None == None as True."""
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return a.strip().lower() == b.strip().lower()
