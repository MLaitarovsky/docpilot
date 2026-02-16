"""Application configuration loaded from environment variables."""

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

    # ── Redis ──────────────────────────────────────────
    redis_url: str = "redis://redis:6379/0"

    # ── JWT Auth ───────────────────────────────────────
    secret_key: str = "change-me-to-a-random-secret"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # ── OpenAI ─────────────────────────────────────────
    openai_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    # ── File Storage ───────────────────────────────────
    upload_dir: str = "/data/uploads"

    # ── CORS ───────────────────────────────────────────
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse the comma-separated CORS_ORIGINS string into a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


# Singleton — import this instance everywhere
settings = Settings()
