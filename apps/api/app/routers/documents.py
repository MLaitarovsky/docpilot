"""Document endpoints — upload, list, detail, delete."""

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.document import Document
from app.models.user import User
from app.schemas.document import (
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
)
from app.tasks.process_document import process_document

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ── POST /api/documents/upload ─────────────────────────


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF contract for processing.

    Saves the file to disk, creates a DB record, and kicks off the
    Celery extraction pipeline asynchronously.
    """
    # Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "data": None,
                "error": {"message": "Only PDF files are accepted", "code": "DOC_INVALID_TYPE"},
            },
        )

    # Read and validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "data": None,
                "error": {"message": "File exceeds 10 MB limit", "code": "DOC_TOO_LARGE"},
            },
        )

    # Build a unique file path: uploads/<team_id>/<uuid>_<filename>
    team_dir = os.path.join(settings.upload_dir, str(user.team_id))
    os.makedirs(team_dir, exist_ok=True)

    file_id = uuid.uuid4()
    safe_name = file.filename or "document.pdf"
    file_path = os.path.join(team_dir, f"{file_id}_{safe_name}")

    # Write file to disk
    with open(file_path, "wb") as f:
        f.write(contents)

    # Create the document record
    document = Document(
        team_id=user.team_id,
        uploaded_by=user.id,
        filename=safe_name,
        file_path=file_path,
        file_size_bytes=len(contents),
        status="uploaded",
    )
    db.add(document)
    await db.flush()

    # Kick off the Celery extraction pipeline
    task = process_document.delay(str(document.id))

    return {
        "data": DocumentUploadResponse(
            document=DocumentResponse.model_validate(document),
            task_id=task.id,
        ).model_dump(),
        "error": None,
    }


# ── GET /api/documents ─────────────────────────────────


@router.get("")
async def list_documents(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all documents for the current user's team, newest first."""
    # Count total
    count_result = await db.execute(
        select(func.count()).select_from(Document).where(Document.team_id == user.team_id)
    )
    total = count_result.scalar_one()

    # Fetch page
    result = await db.execute(
        select(Document)
        .where(Document.team_id == user.team_id)
        .order_by(Document.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    documents = result.scalars().all()

    return {
        "data": DocumentListResponse(
            documents=[DocumentResponse.model_validate(d) for d in documents],
            total=total,
            limit=limit,
            offset=offset,
        ).model_dump(),
        "error": None,
    }


# ── GET /api/documents/{id} ───────────────────────────


@router.get("/{document_id}")
async def get_document(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single document with its extractions and clauses."""
    result = await db.execute(
        select(Document)
        .options(
            selectinload(Document.extractions),
            selectinload(Document.clauses),
        )
        .where(Document.id == document_id, Document.team_id == user.team_id)
    )
    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "data": None,
                "error": {"message": "Document not found", "code": "DOC_NOT_FOUND"},
            },
        )

    return {
        "data": DocumentDetailResponse.model_validate(document).model_dump(),
        "error": None,
    }


# ── DELETE /api/documents/{id} ─────────────────────────


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document, its file on disk, and all related records."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.team_id == user.team_id,
        )
    )
    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "data": None,
                "error": {"message": "Document not found", "code": "DOC_NOT_FOUND"},
            },
        )

    # Delete the file from disk (best-effort)
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    await db.delete(document)

    return {
        "data": {"message": "Document deleted"},
        "error": None,
    }
