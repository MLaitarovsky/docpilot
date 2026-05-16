"""Annotation endpoints — notes attached to clauses."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.annotation import Annotation
from app.models.clause import Clause
from app.models.document import Document
from app.models.user import User

router = APIRouter(prefix="/api/clauses", tags=["annotations"])


class CreateAnnotationRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class AnnotationResponse(BaseModel):
    id: uuid.UUID
    clause_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


async def _load_clause(
    clause_id: uuid.UUID, team_id: uuid.UUID, db: AsyncSession
) -> Clause:
    """Fetch a clause and verify it belongs to the team."""
    result = await db.execute(
        select(Clause)
        .join(Document, Document.id == Clause.document_id)
        .where(Clause.id == clause_id, Document.team_id == team_id)
    )
    clause = result.scalar_one_or_none()
    if clause is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "data": None,
                "error": {"message": "Clause not found", "code": "CLAUSE_NOT_FOUND"},
            },
        )
    return clause


@router.get("/{clause_id}/annotations")
async def list_annotations(
    clause_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all annotations on a clause."""
    await _load_clause(clause_id, user.team_id, db)

    result = await db.execute(
        select(Annotation)
        .options(selectinload(Annotation.user))
        .where(Annotation.clause_id == clause_id)
        .order_by(Annotation.created_at)
    )
    annotations = result.scalars().all()

    return {
        "data": [
            AnnotationResponse(
                id=a.id,
                clause_id=a.clause_id,
                user_id=a.user_id,
                user_name=a.user.full_name,
                content=a.content,
                created_at=a.created_at,
            ).model_dump()
            for a in annotations
        ],
        "error": None,
    }


@router.post("/{clause_id}/annotations", status_code=status.HTTP_201_CREATED)
async def create_annotation(
    clause_id: uuid.UUID,
    body: CreateAnnotationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add an annotation to a clause."""
    await _load_clause(clause_id, user.team_id, db)

    annotation = Annotation(
        clause_id=clause_id,
        user_id=user.id,
        content=body.content.strip(),
    )
    db.add(annotation)
    await db.commit()
    await db.refresh(annotation)

    return {
        "data": AnnotationResponse(
            id=annotation.id,
            clause_id=annotation.clause_id,
            user_id=annotation.user_id,
            user_name=user.full_name,
            content=annotation.content,
            created_at=annotation.created_at,
        ).model_dump(),
        "error": None,
    }


@router.delete("/annotations/{annotation_id}")
async def delete_annotation(
    annotation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an annotation. Only the original author can delete their own annotation."""
    result = await db.execute(
        select(Annotation)
        .join(Clause, Clause.id == Annotation.clause_id)
        .join(Document, Document.id == Clause.document_id)
        .where(
            Annotation.id == annotation_id,
            Document.team_id == user.team_id,
        )
    )
    annotation = result.scalar_one_or_none()

    if annotation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "data": None,
                "error": {"message": "Annotation not found", "code": "ANNOTATION_NOT_FOUND"},
            },
        )

    if annotation.user_id != user.id and user.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "data": None,
                "error": {
                    "message": "You can only delete your own annotations.",
                    "code": "ANNOTATION_FORBIDDEN",
                },
            },
        )

    await db.delete(annotation)
    await db.commit()

    return {"data": {"message": "Annotation deleted"}, "error": None}
