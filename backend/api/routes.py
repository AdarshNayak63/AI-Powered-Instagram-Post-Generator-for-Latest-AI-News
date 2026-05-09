from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from core.database import get_db
from models import models
from schemas import schemas
from worker.tasks import scrape_articles_task, send_email_task
from services.ai import generate_instagram_content
from services.image_generator import ImageGenerator

router = APIRouter()

@router.get("/articles", response_model=List[schemas.ArticleResponse])
def get_articles(days: int = 10, db: Session = Depends(get_db)):
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    articles = db.query(models.Article).filter(models.Article.published_date >= cutoff_date).order_by(models.Article.published_date.desc()).limit(50).all()
    return articles

@router.post("/scrape")
def trigger_scrape(days: int = 1):
    # Trigger background celery task
    task = scrape_articles_task.delay(days)
    return {"message": "Scraping started", "task_id": task.id}

@router.post("/generate", response_model=schemas.PostResponse)
def generate_post(request: schemas.GenerateRequest, db: Session = Depends(get_db)):
    article = db.query(models.Article).filter(models.Article.id == request.article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
        
    # Generate content with Groq
    ai_content = generate_instagram_content(article.title, article.summary, article.title)
    
    # Generate initial image using default template
    generator = ImageGenerator(template_name="modern_dark")
    output_filename = f"post_{article.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.png"
    # Output dir logic, simple for now (assumes we have a static/ dir)
    import os
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, output_filename)
    
    try:
        generator.generate(
            title=ai_content.get("title", article.title),
            description=ai_content.get("caption", article.summary),
            article_image_url=article.image_url,
            output_path=output_path
        )
    except Exception as e:
        print(f"Error generating image: {e}")
        output_filename = "placeholder.png"

    new_post = models.Post(
        article_id=article.id,
        generated_title=ai_content.get("title", article.title),
        generated_caption=ai_content.get("caption", article.summary) + "\n\n" + ai_content.get("hashtags", "#AI"),
        hashtags=ai_content.get("hashtags", ""),
        template_used="modern_dark",
        image_path=f"static/{output_filename}"
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.get("/posts/{post_id}", response_model=schemas.PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.put("/posts/{post_id}", response_model=schemas.PostResponse)
def update_post(post_id: int, update_data: dict, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if "generated_title" in update_data:
        post.generated_title = update_data["generated_title"]
    if "generated_caption" in update_data:
        post.generated_caption = update_data["generated_caption"]
        
    db.commit()
    db.refresh(post)
    return post

@router.post("/image")
def generate_image_route(request: dict, db: Session = Depends(get_db)):
    post_id = request.get("post_id")
    template = request.get("template", "modern_dark")
    
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    generator = ImageGenerator(template_name=template)
    output_filename = f"post_{post.article_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.png"
    import os
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, output_filename)
    
    generator.generate(
        title=post.generated_title,
        description=post.generated_caption,
        article_image_url=post.article.image_url if post.article else None,
        output_path=output_path
    )
    
    post.template_used = template
    post.image_path = f"static/{output_filename}"
    db.commit()
    db.refresh(post)
    
    return {"message": "Image regenerated", "post": post}

@router.post("/email")
def send_email(request: schemas.EmailRequest, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == request.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    # Trigger background email task
    task = send_email_task.delay(request.post_id, request.email_to)
    return {"message": "Email sending started", "task_id": task.id}

@router.get("/templates")
def get_templates():
    return {
        "templates": [
            {"id": "modern_dark", "name": "Modern Dark"},
            {"id": "glassmorphism", "name": "Glassmorphism"},
            {"id": "minimal_light", "name": "Minimal Light"},
            {"id": "tech_neon", "name": "Tech Neon"}
        ]
    }
