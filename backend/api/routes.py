from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from datetime import datetime, timedelta

from core.database import get_db
from models import models
from schemas import schemas
from services.ai import generate_instagram_content
from services.image_generator import ImageGenerator

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

        generator = ImageGenerator(template_name="modern_dark")
        output_filename = f"post_{article.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.png"
        import os
        output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, output_filename)

        generator.generate(
            title=ai_content.get("title", article.title),
            description=ai_content.get("caption", article.summary),
            article_image_url=article.image_url,
            output_path=output_path
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate image: {str(e)}")

    try:
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save generated post: {str(e)}")

@router.get("/posts", response_model=List[schemas.PostResponse])
def get_posts(db: Session = Depends(get_db)):
    posts = db.query(models.Post).order_by(models.Post.created_at.desc()).limit(50).all()
    return posts

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
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to regenerate image: {str(e)}")

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
    print("DEBUG: get_templates called - returning new template list")
    return {
        "templates": [
            {"id": "professional_clean", "name": "Professional Clean"},
            {"id": "clean_modern", "name": "Clean Modern"},
            {"id": "clean_minimal", "name": "Clean Minimal"},
            {"id": "clean_gradient", "name": "Clean Gradient"},
            {"id": "modern_dark", "name": "Modern Dark"},
            {"id": "glassmorphism", "name": "Glassmorphism"},
            {"id": "minimal_light", "name": "Minimal Light"},
            {"id": "tech_neon", "name": "Tech Neon"}
        ]
    }
