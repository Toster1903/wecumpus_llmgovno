from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Wecupmus"
    DATABASE_URL: str = "postgresql+psycopg2://dmitriy@localhost:5432/wecupmus"
    SECRET_KEY: str = "SUPER_SECRET_KEY_REPLACE_IT" # Для JWT
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30
    
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
