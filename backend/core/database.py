from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from core.config import settings
from pathlib import Path

database_url = settings.DATABASE_URL

# Normalize relative SQLite paths to the backend directory so running uvicorn
# from different working directories still points to the same DB file.
if database_url.startswith("sqlite:///./"):
    backend_dir = Path(__file__).resolve().parents[1]
    db_filename = database_url.replace("sqlite:///./", "", 1)
    database_url = f"sqlite:///{(backend_dir / db_filename).as_posix()}"

if database_url.startswith("sqlite"):
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
