from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api.routes import router as api_router
import os
from core.database import Base, engine
from models import models  # noqa: F401 - ensure model metadata is registered

app = FastAPI(title="AI-Powered Instagram Post Generator API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

# Ensure local/dev databases are initialized even when migrations are missing.
Base.metadata.create_all(bind=engine)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def read_root():
    return {"message": "Welcome to AI-Powered Instagram Post Generator API"}
