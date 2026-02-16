"""Comparison endpoints — compare two documents side by side."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.comparison import Comparison
from app.models.document import Document
from app.models.user import User
from app.schemas.compare import (
    CompareRequest,
    ComparisonListResponse,
    ComparisonResponse,
)
from app.services.compare_service import compare_clauses, compare_extractions

router = APIRouter(prefix="/api/compare", tags=["compare"])


# ── Helper to build the response with filenames ──────────


async def _build_response(
    comparison: Comparison,
    db: AsyncSession,
) -> ComparisonResponse:
    """Attach doc_a_filename and doc_b_filename to a Comparison row."""
    # Fetch filenames in one query
    result = await db.execute(
        select(Document.id, Document.filename).where(
            Document.id.in_([comparison.doc_a_id, comparison.doc_b_id])
        )
    )
    name_map = {row.id: row.filename for row in result}

    return ComparisonResponse(
        id=comparison.id,
        doc_a_id=comparison.doc_a_id,
        doc_b_id=comparison.doc_b_id,
        doc_a_filename=name_map.get(comparison.doc_a_id, "Unknown"),
        doc_b_filename=name_map.get(comparison.doc_b_id, "Unknown"),
        diff_result=comparison.diff_result,
        created_by=comparison.created_by,
        created_at=comparison.created_at,
    )


# ── POST /api/compare ────────────────────────────────────


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_comparison(
    body: CompareRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compare two completed documents and save the result."""
    if body.doc_a_id == body.doc_b_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "data": None,
                "error": {
                    "message": "Cannot compare a document with itself",
                    "code": "COMPARE_SAME_DOC",
                },
            },
        )

    # Fetch both documents with extractions + clauses
    result = await db.execute(
        select(Document)
        .options(
            selectinload(Document.extractions),
            selectinload(Document.clauses),
        )
        .where(
            Document.id.in_([body.doc_a_id, body.doc_b_id]),
            Document.team_id == user.team_id,
        )
    )
    docs = {d.id: d for d in result.scalars().all()}

    if body.doc_a_id not in docs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "data": None,
                "error": {"message": "Document A not found", "code": "DOC_NOT_FOUND"},
            },
        )
    if body.doc_b_id not in docs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "data": None,
                "error": {"message": "Document B not found", "code": "DOC_NOT_FOUND"},
            },
        )

    doc_a = docs[body.doc_a_id]
    doc_b = docs[body.doc_b_id]

    for label, doc in [("A", doc_a), ("B", doc_b)]:
        if doc.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "data": None,
                    "error": {
                        "message": f"Document {label} is not completed (status: {doc.status})",
                        "code": "DOC_NOT_COMPLETED",
                    },
                },
            )
        if not doc.extractions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "data": None,
                    "error": {
                        "message": f"Document {label} has no extraction data",
                        "code": "DOC_NO_EXTRACTION",
                    },
                },
            )

    # Run comparisons
    extraction_diff = compare_extractions(
        doc_a.extractions[0].extracted_data,
        doc_b.extractions[0].extracted_data,
    )

    clause_a = [
        {
            "clause_type": c.clause_type,
            "risk_level": c.risk_level,
            "plain_summary": c.plain_summary,
        }
        for c in doc_a.clauses
    ]
    clause_b = [
        {
            "clause_type": c.clause_type,
            "risk_level": c.risk_level,
            "plain_summary": c.plain_summary,
        }
        for c in doc_b.clauses
    ]
    clause_diff = compare_clauses(clause_a, clause_b)

    diff_result = {
        "field_diff": extraction_diff["field_diff"],
        "clause_diff": clause_diff,
        "summary": extraction_diff["summary"],
    }

    # Save to DB
    comparison = Comparison(
        team_id=user.team_id,
        doc_a_id=body.doc_a_id,
        doc_b_id=body.doc_b_id,
        diff_result=diff_result,
        created_by=user.id,
    )
    db.add(comparison)
    await db.flush()

    resp = ComparisonResponse(
        id=comparison.id,
        doc_a_id=comparison.doc_a_id,
        doc_b_id=comparison.doc_b_id,
        doc_a_filename=doc_a.filename,
        doc_b_filename=doc_b.filename,
        diff_result=diff_result,
        created_by=comparison.created_by,
        created_at=comparison.created_at,
    )

    return {"data": resp.model_dump(), "error": None}


# ── GET /api/compare ─────────────────────────────────────


@router.get("")
async def list_comparisons(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all comparisons for the current team, newest first."""
    count_result = await db.execute(
        select(func.count()).select_from(Comparison).where(Comparison.team_id == user.team_id)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(Comparison)
        .where(Comparison.team_id == user.team_id)
        .order_by(Comparison.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    comparisons = result.scalars().all()

    # Collect all referenced doc IDs and fetch filenames
    doc_ids = set()
    for c in comparisons:
        if c.doc_a_id:
            doc_ids.add(c.doc_a_id)
        if c.doc_b_id:
            doc_ids.add(c.doc_b_id)

    name_map: dict[uuid.UUID, str] = {}
    if doc_ids:
        names_result = await db.execute(
            select(Document.id, Document.filename).where(Document.id.in_(doc_ids))
        )
        name_map = {row.id: row.filename for row in names_result}

    items = [
        ComparisonResponse(
            id=c.id,
            doc_a_id=c.doc_a_id,
            doc_b_id=c.doc_b_id,
            doc_a_filename=name_map.get(c.doc_a_id, "Deleted"),
            doc_b_filename=name_map.get(c.doc_b_id, "Deleted"),
            diff_result=c.diff_result,
            created_by=c.created_by,
            created_at=c.created_at,
        )
        for c in comparisons
    ]

    return {
        "data": ComparisonListResponse(
            comparisons=items,
            total=total,
            limit=limit,
            offset=offset,
        ).model_dump(),
        "error": None,
    }


# ── GET /api/compare/{id} ────────────────────────────────


@router.get("/{comparison_id}")
async def get_comparison(
    comparison_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single comparison by ID. Team-scoped."""
    result = await db.execute(
        select(Comparison).where(
            Comparison.id == comparison_id,
            Comparison.team_id == user.team_id,
        )
    )
    comparison = result.scalar_one_or_none()

    if comparison is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "data": None,
                "error": {
                    "message": "Comparison not found",
                    "code": "COMPARE_NOT_FOUND",
                },
            },
        )

    resp = await _build_response(comparison, db)
    return {"data": resp.model_dump(), "error": None}


# ── DELETE /api/compare/{id} ──────────────────────────────


@router.delete("/{comparison_id}")
async def delete_comparison(
    comparison_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a comparison. Team-scoped."""
    result = await db.execute(
        select(Comparison).where(
            Comparison.id == comparison_id,
            Comparison.team_id == user.team_id,
        )
    )
    comparison = result.scalar_one_or_none()

    if comparison is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "data": None,
                "error": {
                    "message": "Comparison not found",
                    "code": "COMPARE_NOT_FOUND",
                },
            },
        )

    await db.delete(comparison)
    return {"data": {"message": "Comparison deleted"}, "error": None}
