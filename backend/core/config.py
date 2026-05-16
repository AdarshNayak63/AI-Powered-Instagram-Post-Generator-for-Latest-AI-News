from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/aipostgen"
    REDIS_URL: str = "redis://redis:6379/0"
    
    EMAIL_SERVICE: str = "smtp"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = ""
    FORCE_EMAIL_TO: str = ""

    class Config:
        env_file = str((Path(__file__).resolve().parent.parent / ".env"))

settings = Settings()
