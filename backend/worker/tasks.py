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
def send_email_task(
    post_id: int,
    email_to: str,
    instagram_hook: str = None,
    description: str = None,
    template_used: str = None,
    template_html: str = None,
    template_image_base64: str = None,
):
    print(f"Sending email for post {post_id} to {email_to}...")
    db = SessionLocal()
    try:
        post = db.query(models.Post).filter(models.Post.id == post_id).first()
        if not post:
            return {"status": "error", "message": "Post not found"}
        
        # Prepare email content from live UI payload first, then DB values.
        article_title = (post.article.title if post.article else "") if hasattr(post, "article") else ""
        hook_text = (instagram_hook or post.generated_title or article_title or "AI Tech Update").strip()
        description_text = (
            description
            or (post.generated_caption or "").strip()
            or ((post.article.summary or "").strip() if post.article else "")
        ).strip()
        template_id = (template_used or post.template_used or "instagram_article_card").strip()
        safe_template_html = (template_html or "").replace("<script", "&lt;script")
        subject = f"AI Instagram Post: {hook_text}"
        body = f"""Hello!

Here's your AI-generated Instagram post:

Instagram Hook (Title):
{hook_text}

Description / Caption:
{description_text}

Selected Dynamic Template (Rendered HTML):
{safe_template_html or '[Template HTML provided in email HTML part]'}

Best regards,
AI Tech News Generator
"""

        # Base64 Inline Image
        inline_image_html = ""
        if template_image_base64:
            inline_image_html = f"""
            <div style="margin:0;padding:0;text-align:center;">
              <img src="{template_image_base64}" alt="Template Preview" style="max-width:100%; height:auto; border-radius:16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display:block; margin: 0 auto;" />
            </div>
            <p style="text-align:center;font-size:12px;color:#6b7280;margin-top:12px;">See the attached PNG image if the preview doesn't load.</p>
            """
        else:
            inline_image_html = f"""
            <div style="margin:0;padding:0;">
                {safe_template_html if safe_template_html else f"<div style='padding:14px;border-radius:10px;background:#f9fafb;border:1px solid #e5e7eb;'>No live template HTML was sent for template: {template_id}</div>"}
            </div>
            """

        html_body = f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:20px;">
      <h2 style="margin:0 0 12px 0;font-size:22px;">Instagram Hook (Title)</h2>
      <p style="margin:0 0 20px 0;font-size:20px;line-height:1.3;font-weight:700;">{hook_text}</p>

      <h3 style="margin:0 0 10px 0;font-size:18px;">Description / Caption</h3>
      <p style="margin:0 0 22px 0;white-space:pre-wrap;line-height:1.55;">{description_text}</p>

      <h3 style="margin:0 0 10px 0;font-size:18px;">Selected Dynamic Template Preview</h3>
      {inline_image_html}
    </div>
  </body>
</html>
"""
        
        # Get image path
        image_path = None
        temp_img_path = None
        if template_image_base64 and template_image_base64.startswith("data:image"):
            import base64
            import tempfile
            try:
                # Extract the base64 part
                header, encoded = template_image_base64.split(",", 1)
                img_data = base64.b64decode(encoded)
                # Create a temporary file to attach
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png", prefix="template_preview_")
                temp_file.write(img_data)
                temp_file.close()
                temp_img_path = temp_file.name
                image_path = temp_img_path
            except Exception as ex:
                print(f"Error decoding template_image_base64: {ex}")
        elif post.image_path:
            # Fallback to post image if template image is not provided
            if post.image_path.startswith("static/"):
                import os
                backend_dir = os.path.dirname(os.path.dirname(__file__))
                image_path = os.path.join(backend_dir, post.image_path)
        
        # Send email
        from services.email import send_email_with_attachment
        success = send_email_with_attachment(email_to, subject, body, image_path, html_body=html_body)
        
        # Clean up temporary file if created
        if temp_img_path:
            try:
                import os
                os.unlink(temp_img_path)
            except:
                pass
        
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
