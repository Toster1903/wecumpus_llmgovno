from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Wecupmus"
    DATABASE_URL: str = "postgresql+psycopg2://dmitriy@localhost:5432/wecupmus"
    SECRET_KEY: str = "SUPER_SECRET_KEY_REPLACE_IT"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 дней

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"
    FRONTEND_URL: str = "http://localhost:5173"

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_BOT_USERNAME: str = ""

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""

    def get_allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if v == "SUPER_SECRET_KEY_REPLACE_IT":
            raise ValueError(
                "SECRET_KEY не задан. Создайте файл .env и укажите SECRET_KEY "
                "(минимум 32 случайных символа). Пример: "
                "python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if len(v) < 32:
            raise ValueError("SECRET_KEY должен содержать минимум 32 символа")
        return v

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
