from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./ethara_local.db"
    SECRET_KEY: str = "change-me-in-production-use-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # development | production
    ENVIRONMENT: str = "development"

    # Comma-separated origins for browser clients (e.g. Vite dev server). Empty uses safe dev defaults.
    CORS_ORIGINS: str = ""

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"

    def cors_origin_list(self) -> List[str]:
        raw = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        if "*" in raw:
            return ["*"]
        if raw:
            return raw
        if self.is_production:
            return []
        return [
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://localhost:3000",
        ]

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        url = str(v).strip()
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url[len("postgres://") :]
        if url.startswith("postgresql://") and "+psycopg" not in url.split("://", 1)[0]:
            return "postgresql+psycopg://" + url[len("postgresql://") :]
        return url

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_not_empty(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError("SECRET_KEY must be set")
        return str(v).strip()


settings = Settings()
