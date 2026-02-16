"""Pydantic schemas for team management requests and responses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

# ── Responses ──────────────────────────────────────────


class TeamMemberResponse(BaseModel):
    """A single team member."""

    id: uuid.UUID
    email: str
    full_name: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamMembersListResponse(BaseModel):
    """Paginated list of team members."""

    members: list[TeamMemberResponse]
    total: int


class TeamInfoResponse(BaseModel):
    """Basic team info."""

    id: uuid.UUID
    name: str
    slug: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Requests ───────────────────────────────────────────


class InviteMemberRequest(BaseModel):
    """Invite a new member by creating an account on their behalf."""

    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="member", pattern=r"^(admin|member)$")


class UpdateRoleRequest(BaseModel):
    """Change a team member's role."""

    role: str = Field(pattern=r"^(admin|member)$")
