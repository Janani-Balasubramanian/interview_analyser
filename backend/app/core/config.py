from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Interview Performance Analyzer"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production-please-use-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = "sqlite:///./interview_analyzer.db"

    # AI
    OPENAI_API_KEY: Optional[str] = None
    USE_MOCK_AI: bool = True

    # Free tier
    FREE_INTERVIEWS_PER_MONTH: int = 4
    BONUS_UNLOCK_SCORE: int = 250

    # CORS — comma-separated list so it's easy to set via a single env var
    # e.g. FRONTEND_URL=https://your-app.netlify.app
    FRONTEND_URL: str = ""

    @property
    def cors_origins(self) -> List[str]:
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        if self.FRONTEND_URL:
            # Support comma-separated list of URLs
            for url in self.FRONTEND_URL.split(","):
                url = url.strip()
                if url and url not in origins:
                    origins.append(url)
        return origins

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
