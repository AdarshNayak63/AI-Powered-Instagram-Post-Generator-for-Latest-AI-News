from pydantic_settings import BaseSettings

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

    class Config:
        env_file = ".env"

settings = Settings()
