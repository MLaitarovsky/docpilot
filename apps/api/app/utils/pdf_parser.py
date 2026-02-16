"""PDF text extraction using PyMuPDF (fitz)."""

import fitz  # PyMuPDF


def extract_text_from_pdf(file_path: str) -> tuple[str, list[dict]]:
    """Extract text from every page of a PDF.

    Returns:
        full_text: Concatenated text from all pages.
        page_map:  List of dicts with per-page metadata:
                   [{"page": 1, "start_char": 0, "end_char": 2500, "text": "..."}, ...]
    """
    doc = fitz.open(file_path)
    page_map: list[dict] = []
    full_text_parts: list[str] = []
    cursor = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")

        start = cursor
        end = cursor + len(text)

        page_map.append(
            {
                "page": page_num + 1,  # 1-indexed
                "start_char": start,
                "end_char": end,
                "text": text,
            }
        )

        full_text_parts.append(text)
        cursor = end

    doc.close()

    full_text = "".join(full_text_parts)
    return full_text, page_map
