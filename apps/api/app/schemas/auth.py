"""Pydantic schemas for authentication requests and responses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ── Requests ───────────────────────────────────────────


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    team_name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Responses ──────────────────────────────────────────


class TeamResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    team: TeamResponse | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    """Combined token + user payload returned on register/login."""

    tokens: TokenResponse
    user: UserResponse


# ── Envelope helpers ───────────────────────────────────


class ErrorDetail(BaseModel):
    message: str
    code: str


class Envelope(BaseModel):
    """Standard API response wrapper."""

    data: object | None = None
    error: ErrorDetail | None = None
