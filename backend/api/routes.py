from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError
from typing import List
from datetime import datetime, timedelta

from core.database import get_db
from models import models
from schemas import schemas
from services.ai import generate_instagram_content

router = APIRouter()

@router.get("/articles", response_model=List[schemas.ArticleResponse])
def get_articles(days: int = 10, db: Session = Depends(get_db)):
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    articles = db.query(models.Article).filter(models.Article.published_date >= cutoff_date).order_by(models.Article.published_date.desc()).limit(50).all()
    return articles

@router.post("/scrape")
def trigger_scrape(days: int = 1, db: Session = Depends(get_db)):
    try:
        # Try background Celery first; if unavailable, run sync fallback.
        try:
            from worker.tasks import scrape_articles_task
            task = scrape_articles_task.delay(days)
            return {"message": "Scraping started", "task_id": task.id, "mode": "async"}
        except Exception as celery_error:
            from services.scraper import ScraperService
            scraper = ScraperService()
            try:
                articles_data = scraper.scrape_all(days_ago=days)
            except Exception as scrape_error:
                # Avoid failing UI flow when a source is temporarily down.
                return {
                    "message": "Scraping unavailable right now",
                    "mode": "sync_fallback",
                    "added_count": 0,
                    "warning": f"Scraper error: {str(scrape_error)}",
                    "celery_warning": f"Celery unavailable: {str(celery_error)}",
                }

            added_count = 0
            existing_urls = {
                row[0] for row in db.query(models.Article.source_url).all() if row and row[0]
            }
            for art_data in articles_data:
                source_url = art_data.get("source_url")
                if not source_url or source_url in existing_urls:
                    continue
                new_article = models.Article(
                    title=art_data["title"],
                    summary=art_data["summary"],
                    content=art_data.get("content", ""),
                    image_url=art_data.get("image_url"),
                    published_date=art_data["published_date"],
                    source_url=source_url,
                )
                try:
                    with db.begin_nested():
                        db.add(new_article)
                        db.flush()
                    existing_urls.add(source_url)
                    added_count += 1
                except IntegrityError:
                    continue

            db.commit()
            response = {
                "message": "Scraping completed in fallback mode",
                "mode": "sync_fallback",
                "added_count": added_count,
                "warning": f"Celery unavailable: {str(celery_error)}",
            }
            return response
    except Exception as e:
        db.rollback()
        return {
            "message": "Scraping failed gracefully",
            "mode": "error",
            "added_count": 0,
            "warning": str(e),
        }

@router.post("/generate", response_model=schemas.PostResponse)
def generate_post(request: schemas.GenerateRequest, db: Session = Depends(get_db)):
    try:
        article = db.query(models.Article).filter(models.Article.id == request.article_id).first()
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        ai_content = generate_instagram_content(article.title, article.summary, article.title)
        card_description = (ai_content.get("card_description") or "").strip()
        if card_description:
            article.summary = card_description
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate post content: {str(e)}")

    try:
        caption_text = (ai_content.get("caption", article.summary) or "").strip()
        hashtags_text = (ai_content.get("hashtags", "#AI") or "").strip()
        if hashtags_text and hashtags_text not in caption_text:
            caption_text = f"{caption_text}\n\n{hashtags_text}" if caption_text else hashtags_text

        new_post = models.Post(
            article_id=article.id,
            generated_title=ai_content.get("title", article.title),
            generated_caption=caption_text,
            hashtags=hashtags_text,
            template_used="instagram_article_card",
            image_path=None,
        )
        db.add(new_post)
        db.commit()
        db.refresh(new_post)
        return new_post
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save generated post: {str(e)}")

@router.get("/posts", response_model=List[schemas.PostResponse])
def get_posts(db: Session = Depends(get_db)):
    posts = db.query(models.Post).options(joinedload(models.Post.article)).order_by(models.Post.created_at.desc()).limit(50).all()
    return posts

@router.get("/posts/{post_id}", response_model=schemas.PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).options(joinedload(models.Post.article)).filter(models.Post.id == post_id).first()
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
    raise HTTPException(
        status_code=410,
        detail="Image generation is disabled. Posts now use an Instagram-ready article card in the frontend.",
    )

@router.post("/email")
def send_email(request: schemas.EmailRequest, db: Session = Depends(get_db)):
    fixed_recipient = "lipunnayak069@gmail.com"
    post = db.query(models.Post).filter(models.Post.id == request.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    # Try background email task first, fallback to synchronous
    try:
        from worker.tasks import send_email_task
        task = send_email_task.delay(request.post_id, fixed_recipient)
        return {"message": "Email sending started", "task_id": task.id, "mode": "async"}
    except Exception as celery_error:
        print(f"Celery unavailable, sending email synchronously: {celery_error}")
        # Fallback to synchronous email sending
        try:
            from worker.tasks import send_email_task
            result = send_email_task(request.post_id, fixed_recipient)
            if result.get("status") == "success":
                return {"message": "Email sent successfully", "mode": "sync", "result": result}
            else:
                return {"message": "Email sending failed", "mode": "sync", "error": result.get("message", "Unknown error")}
        except Exception as sync_error:
            print(f"Synchronous email sending failed: {sync_error}")
            raise HTTPException(status_code=500, detail=f"Email sending failed: {str(sync_error)}")

@router.get("/templates")
def get_templates():
    return {"templates": []}
