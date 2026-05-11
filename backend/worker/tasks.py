try:
    from celery import shared_task
    CELERY_AVAILABLE = True
except ImportError:
    # Fallback decorator when celery is not available
    def shared_task(name):
        def decorator(func):
            return func
        return decorator
    CELERY_AVAILABLE = False

import time
from services.scraper import ScraperService
from core.database import SessionLocal
from models import models

@shared_task(name="scrape_articles_task")
def scrape_articles_task(filter_days: int = 1):
    print(f"Starting scraping job for the last {filter_days} days...")
    scraper = ScraperService()
    articles_data = scraper.scrape_all(days_ago=filter_days)
    
    if not articles_data:
        return {"status": "success", "message": "No articles found"}
        
    db = SessionLocal()
    try:
        added_count = 0
        for art_data in articles_data:
            # Check if exists
            exists = db.query(models.Article).filter(models.Article.source_url == art_data['source_url']).first()
            if not exists:
                new_article = models.Article(
                    title=art_data['title'],
                    summary=art_data['summary'],
                    content=art_data.get('content', ''),
                    image_url=art_data['image_url'],
                    published_date=art_data['published_date'],
                    source_url=art_data['source_url']
                )
                db.add(new_article)
                added_count += 1
        db.commit()
        print(f"Scraping complete. Added {added_count} new articles.")
        return {"status": "success", "message": f"Added {added_count} new articles"}
    except Exception as e:
        db.rollback()
        print(f"Database error during scraping: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

@shared_task(name="send_email_task")
def send_email_task(post_id: int, email_to: str):
    print(f"Sending email for post {post_id} to {email_to}...")
    db = SessionLocal()
    try:
        post = db.query(models.Post).filter(models.Post.id == post_id).first()
        if not post:
            return {"status": "error", "message": "Post not found"}
        
        # Prepare email content
        subject = f"AI Instagram Post: {post.generated_title}"
        body = f"""Hello!

Here's your AI-generated Instagram post:

Title: {post.generated_title}

Caption:
{post.generated_caption}

Template: {post.template_used}

Best regards,
AI Tech News Generator
"""
        
        # Get image path
        image_path = None
        if post.image_path:
            # Convert relative path to absolute
            if post.image_path.startswith("static/"):
                import os
                backend_dir = os.path.dirname(os.path.dirname(__file__))
                image_path = os.path.join(backend_dir, post.image_path)
        
        # Send email
        from services.email import send_email_with_attachment
        success = send_email_with_attachment(email_to, subject, body, image_path)
        
        # Log the attempt
        log = models.Log(
            post_id=post.id,
            email_sent_to=email_to,
            status="success" if success else "failed"
        )
        db.add(log)
        db.commit()
        
        return {"status": "success" if success else "failed", "post_id": post_id, "email_to": email_to}
        
    except Exception as e:
        db.rollback()
        print(f"Error sending email: {e}")
        # Log the failure
        try:
            log = models.Log(
                post_id=post_id,
                email_sent_to=email_to,
                status="failed",
                error_message=str(e)
            )
            db.add(log)
            db.commit()
        except:
            pass
        return {"status": "error", "message": str(e), "post_id": post_id, "email_to": email_to}
    finally:
        db.close()
