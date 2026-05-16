from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime

# --- Article Schemas ---
class ArticleBase(BaseModel):
    title: str
    summary: str
    image_url: Optional[str] = None
    published_date: datetime
    source_url: str

class ArticleCreate(ArticleBase):
    content: Optional[str] = None

class ArticleResponse(ArticleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Post Schemas ---
class PostBase(BaseModel):
    generated_title: str
    generated_caption: str
    hashtags: str
    template_used: str

class PostCreate(PostBase):
    article_id: int

class PostResponse(PostBase):
    id: int
    image_path: Optional[str] = None
    created_at: datetime
    article: Optional[ArticleResponse] = None

    class Config:
        from_attributes = True

# --- Generate Request Schema ---
class GenerateRequest(BaseModel):
    article_id: int

# --- Email Request Schema ---
class EmailRequest(BaseModel):
    post_id: int
    email_to: str
    instagram_hook: Optional[str] = None
    description: Optional[str] = None
    template_used: Optional[str] = None
    template_html: Optional[str] = None
