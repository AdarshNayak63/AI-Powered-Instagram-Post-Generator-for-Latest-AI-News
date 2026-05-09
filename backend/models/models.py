from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    summary = Column(Text)
    content = Column(Text, nullable=True) # Full scraped content if needed
    image_url = Column(String, nullable=True)
    published_date = Column(DateTime, default=datetime.utcnow)
    source_url = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    posts = relationship("Post", back_populates="article")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id"))
    generated_title = Column(String)
    generated_caption = Column(Text)
    hashtags = Column(String)
    template_used = Column(String)
    image_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    article = relationship("Article", back_populates="posts")
    logs = relationship("Log", back_populates="post")

class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    email_sent_to = Column(String)
    status = Column(String) # 'success' or 'failed'
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    post = relationship("Post", back_populates="logs")
