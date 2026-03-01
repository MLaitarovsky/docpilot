"""Application configuration loaded from environment variables."""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central config — reads from .env at the project root."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Database ───────────────────────────────────────
    database_url: str = "postgresql+asyncpg://docpilot:docpilot_secret@postgres:5432/docpilot"

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_database_url(cls, v: str) -> str:
        """Ensure the URL uses the asyncpg driver for SQLAlchemy async.

        Railway (and Heroku) provide plain ``postgres://`` or
        ``postgresql://`` URLs without a driver specifier.  We rewrite
        them to ``postgresql+asyncpg://`` so SQLAlchemy can connect.
        """
        if v.startswith("postgres://"):
            # postgres:// → postgresql+asyncpg://
            return "postgresql+asyncpg" + v[len("postgres") :]
        if v.startswith("postgresql://"):
            # postgresql:// → postgresql+asyncpg://
            return "postgresql+asyncpg" + v[len("postgresql") :]
        # Already has a driver (e.g. postgresql+asyncpg://) — leave alone
        return v

    # ── Redis ──────────────────────────────────────────
    redis_url: str = "redis://redis:6379/0"

    # ── JWT Auth ───────────────────────────────────────
    # No default — must be set in the environment.  The app will refuse to
    # start if SECRET_KEY is missing, which is the correct production behaviour.
    secret_key: str
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # ── OpenAI ─────────────────────────────────────────
    # No default — must be configured before the extraction pipeline runs.
    openai_api_key: str
    llm_model: str = "gpt-4o-mini"

    # ── File Storage ───────────────────────────────────
    # Use a relative path so it works out-of-the-box on Railway and locally.
    upload_dir: str = "./uploads"

    # ── CORS ───────────────────────────────────────────
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse the comma-separated CORS_ORIGINS string into a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


# Singleton — import this instance everywhere
settings = Settings()
