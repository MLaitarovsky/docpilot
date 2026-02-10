"""Shared FastAPI dependencies — auth, database, etc."""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.services.auth_service import decode_token

# Extracts the Bearer token from the Authorization header
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode the JWT access token and return the authenticated user.

    Raises 401 if the token is missing, invalid, expired, or the user
    no longer exists in the database.
    """
    token = credentials.credentials

    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"data": None, "error": {"message": "Invalid or expired token", "code": "AUTH_TOKEN_INVALID"}},
        )

    # Reject refresh tokens used on protected routes
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"data": None, "error": {"message": "Invalid token type", "code": "AUTH_TOKEN_INVALID"}},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"data": None, "error": {"message": "Invalid token payload", "code": "AUTH_TOKEN_INVALID"}},
        )

    # Fetch the user with their team eagerly loaded
    result = await db.execute(
        select(User)
        .options(selectinload(User.team))
        .where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"data": None, "error": {"message": "User not found", "code": "AUTH_USER_NOT_FOUND"}},
        )

    return user
