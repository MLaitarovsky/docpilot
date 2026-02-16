"""Team management endpoints — list members, invite, update role, remove."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.team import (
    InviteMemberRequest,
    TeamInfoResponse,
    TeamMemberResponse,
    TeamMembersListResponse,
    UpdateRoleRequest,
)
from app.services.auth_service import hash_password

router = APIRouter(prefix="/api/team", tags=["team"])


# ── Helpers ──────────────────────────────────────────────


def _require_admin_or_owner(user: User) -> None:
    """Raise 403 unless the user is an owner or admin."""
    if user.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "data": None,
                "error": {
                    "message": "Only team owners and admins can perform this action",
                    "code": "TEAM_FORBIDDEN",
                },
            },
        )


# ── GET /api/team ────────────────────────────────────────


@router.get("")
async def get_team_info(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return basic team info for the current user."""
    if user.team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "data": None,
                "error": {"message": "No team found", "code": "TEAM_NOT_FOUND"},
            },
        )

    return {
        "data": TeamInfoResponse.model_validate(user.team).model_dump(),
        "error": None,
    }


# ── GET /api/team/members ────────────────────────────────


@router.get("/members")
async def list_members(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all members in the current user's team."""
    # Count
    count_result = await db.execute(
        select(func.count())
        .select_from(User)
        .where(User.team_id == user.team_id)
    )
    total = count_result.scalar_one()

    # Fetch all members
    result = await db.execute(
        select(User)
        .where(User.team_id == user.team_id)
        .order_by(User.created_at.asc())
    )
    members = result.scalars().all()

    return {
        "data": TeamMembersListResponse(
            members=[TeamMemberResponse.model_validate(m) for m in members],
            total=total,
        ).model_dump(),
        "error": None,
    }


# ── POST /api/team/members ──────────────────────────────


@router.post("/members", status_code=status.HTTP_201_CREATED)
async def invite_member(
    body: InviteMemberRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a new member to the team (owner/admin only).

    Creates a new user account with the given email and password,
    assigned to the current user's team.
    """
    _require_admin_or_owner(user)

    # Check if email is already taken
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "data": None,
                "error": {
                    "message": "Email already registered",
                    "code": "AUTH_EMAIL_EXISTS",
                },
            },
        )

    new_member = User(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        team_id=user.team_id,
        role=body.role,
    )
    db.add(new_member)
    await db.flush()

    return {
        "data": TeamMemberResponse.model_validate(new_member).model_dump(),
        "error": None,
    }


# ── PUT /api/team/members/{member_id}/role ───────────────


@router.put("/members/{member_id}/role")
async def update_member_role(
    member_id: uuid.UUID,
    body: UpdateRoleRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change a team member's role (owner/admin only)."""
    _require_admin_or_owner(user)

    # Cannot change your own role
    if member_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "data": None,
                "error": {
                    "message": "You cannot change your own role",
                    "code": "TEAM_SELF_ROLE",
                },
            },
        )

    result = await db.execute(
        select(User).where(
            User.id == member_id,
            User.team_id == user.team_id,
        )
    )
    member = result.scalar_one_or_none()

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "data": None,
                "error": {
                    "message": "Member not found",
                    "code": "TEAM_MEMBER_NOT_FOUND",
                },
            },
        )

    # Cannot change the owner's role
    if member.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "data": None,
                "error": {
                    "message": "Cannot change the team owner's role",
                    "code": "TEAM_OWNER_PROTECTED",
                },
            },
        )

    member.role = body.role

    return {
        "data": TeamMemberResponse.model_validate(member).model_dump(),
        "error": None,
    }


# ── DELETE /api/team/members/{member_id} ─────────────────


@router.delete("/members/{member_id}")
async def remove_member(
    member_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from the team (owner/admin only)."""
    _require_admin_or_owner(user)

    # Cannot remove yourself
    if member_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "data": None,
                "error": {
                    "message": "You cannot remove yourself from the team",
                    "code": "TEAM_SELF_REMOVE",
                },
            },
        )

    result = await db.execute(
        select(User).where(
            User.id == member_id,
            User.team_id == user.team_id,
        )
    )
    member = result.scalar_one_or_none()

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "data": None,
                "error": {
                    "message": "Member not found",
                    "code": "TEAM_MEMBER_NOT_FOUND",
                },
            },
        )

    # Cannot remove the owner
    if member.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "data": None,
                "error": {
                    "message": "Cannot remove the team owner",
                    "code": "TEAM_OWNER_PROTECTED",
                },
            },
        )

    await db.delete(member)

    return {
        "data": {"message": "Member removed from team"},
        "error": None,
    }
