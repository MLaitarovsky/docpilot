"""Authentication endpoints — register, login, refresh, me."""

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.team import Team
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _slugify(name: str) -> str:
    """Convert a team name to a URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    return slug


# ── POST /api/auth/register ───────────────────────────


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new team and owner account."""

    # Check if email is already taken
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"data": None, "error": {"message": "Email already registered", "code": "AUTH_EMAIL_EXISTS"}},
        )

    # Generate a unique slug from the team name
    base_slug = _slugify(body.team_name)
    slug = base_slug
    slug_conflict = await db.execute(select(Team).where(Team.slug == slug))
    if slug_conflict.scalar_one_or_none() is not None:
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

    # Create the team
    team = Team(name=body.team_name, slug=slug)
    db.add(team)
    await db.flush()  # populate team.id

    # Create the user as owner of the new team
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        team_id=team.id,
        role="owner",
    )
    db.add(user)
    await db.flush()  # populate user.id

    # Build tokens
    access_token = create_access_token(user.id, team.id)
    refresh_token = create_refresh_token(user.id)

    # Eagerly load the team relationship for the response
    user.team = team

    return {
        "data": AuthResponse(
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
            ),
            user=UserResponse.model_validate(user),
        ).model_dump(),
        "error": None,
    }


# ── POST /api/auth/login ──────────────────────────────


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email + password, receive JWT tokens."""

    result = await db.execute(
        select(User)
        .options(selectinload(User.team))
        .where(User.email == body.email)
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"data": None, "error": {"message": "Invalid email or password", "code": "AUTH_INVALID"}},
        )

    access_token = create_access_token(user.id, user.team_id)
    refresh_token = create_refresh_token(user.id)

    return {
        "data": AuthResponse(
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
            ),
            user=UserResponse.model_validate(user),
        ).model_dump(),
        "error": None,
    }


# ── POST /api/auth/refresh ────────────────────────────


@router.post("/refresh")
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""

    try:
        payload = decode_token(body.refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"data": None, "error": {"message": "Invalid or expired refresh token", "code": "AUTH_REFRESH_INVALID"}},
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"data": None, "error": {"message": "Token is not a refresh token", "code": "AUTH_REFRESH_INVALID"}},
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"data": None, "error": {"message": "User not found", "code": "AUTH_USER_NOT_FOUND"}},
        )

    new_access_token = create_access_token(user.id, user.team_id)

    return {
        "data": TokenResponse(
            access_token=new_access_token,
            refresh_token=body.refresh_token,
        ).model_dump(),
        "error": None,
    }


# ── GET /api/auth/me ──────────────────────────────────


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return {
        "data": UserResponse.model_validate(current_user).model_dump(),
        "error": None,
    }
