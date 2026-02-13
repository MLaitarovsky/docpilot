"""Paragraph-aware text chunking with overlap."""


def _find_pages(start_char: int, end_char: int, page_map: list[dict]) -> list[int]:
    """Return the 1-indexed page numbers that a character range spans."""
    pages: list[int] = []
    for pm in page_map:
        if pm["end_char"] <= start_char:
            continue
        if pm["start_char"] >= end_char:
            break
        pages.append(pm["page"])
    return pages


def chunk_text(
    text: str,
    page_map: list[dict],
    chunk_size: int = 2000,
    overlap: int = 200,
) -> list[dict]:
    """Split text into overlapping chunks that respect paragraph boundaries.

    Each chunk is a dict with:
        text, start_char, end_char, pages (list of page numbers it spans)
    """
    if not text.strip():
        return []

    # Split into paragraphs (double newline)
    paragraphs: list[tuple[int, str]] = []
    start = 0
    for block in text.split("\n\n"):
        block_text = block.strip()
        if block_text:
            # Find the actual start position in original text
            idx = text.find(block, start)
            if idx == -1:
                idx = start
            paragraphs.append((idx, block_text))
            start = idx + len(block)

    if not paragraphs:
        return [{
            "text": text.strip(),
            "start_char": 0,
            "end_char": len(text),
            "pages": _find_pages(0, len(text), page_map),
        }]

    chunks: list[dict] = []
    current_texts: list[str] = []
    current_start: int = paragraphs[0][0]
    current_len: int = 0

    for para_start, para_text in paragraphs:
        para_len = len(para_text)

        # If adding this paragraph exceeds chunk_size and we have content,
        # flush the current chunk
        if current_len + para_len > chunk_size and current_texts:
            chunk_body = "\n\n".join(current_texts)
            end_char = current_start + len(chunk_body)
            chunks.append({
                "text": chunk_body,
                "start_char": current_start,
                "end_char": end_char,
                "pages": _find_pages(current_start, end_char, page_map),
            })

            # Overlap: keep trailing paragraphs that fit within `overlap` chars
            overlap_texts: list[str] = []
            overlap_len = 0
            for t in reversed(current_texts):
                if overlap_len + len(t) > overlap:
                    break
                overlap_texts.insert(0, t)
                overlap_len += len(t)

            current_texts = overlap_texts
            current_len = overlap_len
            # Approximate start of overlap region
            if overlap_texts:
                current_start = end_char - overlap_len
            else:
                current_start = para_start

        current_texts.append(para_text)
        current_len += para_len

    # Flush remaining
    if current_texts:
        chunk_body = "\n\n".join(current_texts)
        end_char = current_start + len(chunk_body)
        chunks.append({
            "text": chunk_body,
            "start_char": current_start,
            "end_char": end_char,
            "pages": _find_pages(current_start, end_char, page_map),
        })

    return chunks
