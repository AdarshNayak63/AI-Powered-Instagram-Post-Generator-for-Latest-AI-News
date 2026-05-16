import smtplib
from email.message import EmailMessage
import os
from core.config import settings

def _clean_env(value: str) -> str:
    if value is None:
        return ""
    cleaned = str(value).strip()
    # Handle accidental quotes copied into .env values.
    if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in {"'", '"'}:
        cleaned = cleaned[1:-1].strip()
    return cleaned

def _is_placeholder(value: str) -> bool:
    if not value:
        return True
    lowered = value.strip().lower()
    return (
        lowered.startswith("your_")
        or "example.com" in lowered
        or lowered in {"changeme", "placeholder"}
    )

def send_email_with_attachment(
    to_email: str,
    subject: str,
    body: str,
    attachment_path: str,
    html_body: str = "",
):
    smtp_user = _clean_env(settings.SMTP_USER)
    smtp_password = _clean_env(settings.SMTP_PASSWORD)
    smtp_host = _clean_env(settings.SMTP_HOST) or "smtp.gmail.com"
    smtp_port = settings.SMTP_PORT or 587
    forced_to = _clean_env(settings.FORCE_EMAIL_TO)
    if forced_to:
        to_email = forced_to
    masked_user = smtp_user[:2] + "***" + smtp_user[-10:] if "@" in smtp_user and len(smtp_user) > 12 else "***"
    print(
        f"SMTP runtime config -> host={smtp_host}:{smtp_port}, user={masked_user}, "
        f"from={(settings.EMAIL_FROM or smtp_user or 'aipostgen@example.com')}, to={to_email}"
    )

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = (settings.EMAIL_FROM or smtp_user or "aipostgen@example.com").strip()
    msg['To'] = to_email
    msg.set_content(body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    if attachment_path and os.path.exists(attachment_path):
        with open(attachment_path, 'rb') as f:
            img_data = f.read()
        msg.add_attachment(img_data, maintype='image', subtype='png', filename=os.path.basename(attachment_path))

    smtp_options = [
        {
            'host': smtp_host,
            'port': smtp_port,
            'user': smtp_user,
            'password': smtp_password,
            'name': 'Configured SMTP'
        }
    ]
    
    for option in smtp_options:
        if (
            not option['user']
            or not option['password']
            or _is_placeholder(option['user'])
            or _is_placeholder(option['password'])
        ):
            continue
            
        try:
            print(f"Attempting to send via {option['name']}: {option['host']}:{option['port']}")
            with smtplib.SMTP(option['host'], option['port']) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(option['user'], option['password'])
                server.send_message(msg)
            print(f"Email sent successfully via {option['name']}")
            return True
        except smtplib.SMTPAuthenticationError as e:
            print(f"{option['name']} authentication failed: {e}")
            print(
                "SMTP auth failed. Verify SMTP_USER/SMTP_PASSWORD in .env. "
                "For Gmail, use a 16-character App Password (not your normal account password)."
            )
            continue
        except Exception as e:
            print(f"{option['name']} failed: {e}")
            continue
    
    # If all SMTP options fail, try to save email to file for debugging
    try:
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        email_file = f"email_{to_email.replace('@', '_')}_{timestamp}.eml"
        
        with open(email_file, 'w') as f:
            f.write(f"From: {msg['From']}\n")
            f.write(f"To: {msg['To']}\n")
            f.write(f"Subject: {msg['Subject']}\n\n")
            f.write(body)
            if attachment_path and os.path.exists(attachment_path):
                f.write(f"\n\nAttachment: {attachment_path}\n")
        
        print(f"Email saved to file: {email_file}")
        print("To enable actual email sending, configure SMTP settings in .env file:")
        print("SMTP_HOST=smtp.gmail.com")
        print("SMTP_PORT=587")
        print("SMTP_USER=your-email@gmail.com")
        print("SMTP_PASSWORD=your-app-password")
        return False
        
    except Exception as e:
        print(f"Failed to save email file: {e}")
        return False
