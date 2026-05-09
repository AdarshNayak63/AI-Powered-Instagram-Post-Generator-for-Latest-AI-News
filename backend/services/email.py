import smtplib
from email.message import EmailMessage
import os
from core.config import settings

def send_email_with_attachment(to_email: str, subject: str, body: str, attachment_path: str):
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = settings.EMAIL_FROM or settings.SMTP_USER
    msg['To'] = to_email
    msg.set_content(body)

    if os.path.exists(attachment_path):
        with open(attachment_path, 'rb') as f:
            img_data = f.read()
        msg.add_attachment(img_data, maintype='image', subtype='png', filename=os.path.basename(attachment_path))

    try:
        if settings.EMAIL_SERVICE.lower() == 'smtp':
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            return True
        elif settings.EMAIL_SERVICE.lower() == 'resend':
            # Resend API integration would go here
            import resend
            resend.api_key = settings.RESEND_API_KEY
            # ... construct resend payload ...
            return False
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
    return False
