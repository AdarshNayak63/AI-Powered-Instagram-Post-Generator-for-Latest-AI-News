from celery import shared_task
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
    # Dummy email sender for now
    # Replace with Resend or SMTP when API keys are available
    print(f"Simulating email send for post {post_id} to {email_to}...")
    db = SessionLocal()
    try:
        post = db.query(models.Post).filter(models.Post.id == post_id).first()
        if post:
            log = models.Log(
                post_id=post.id,
                email_to=email_to,
                status="success"
            )
            db.add(log)
            db.commit()
    except Exception as e:
        db.rollback()
        print(e)
    finally:
        db.close()
    return {"status": "success", "post_id": post_id, "email_to": email_to}
