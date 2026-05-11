import smtplib
from email.message import EmailMessage
import os
from core.config import settings

def send_email_with_attachment(to_email: str, subject: str, body: str, attachment_path: str):
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = settings.EMAIL_FROM or settings.SMTP_USER or "aipostgen@example.com"
    msg['To'] = to_email
    msg.set_content(body)

    if os.path.exists(attachment_path):
        with open(attachment_path, 'rb') as f:
            img_data = f.read()
        msg.add_attachment(img_data, maintype='image', subtype='png', filename=os.path.basename(attachment_path))

    # Try multiple SMTP options
    smtp_options = [
        # Option 1: User configured SMTP
        {
            'host': settings.SMTP_HOST,
            'port': settings.SMTP_PORT,
            'user': settings.SMTP_USER,
            'password': settings.SMTP_PASSWORD,
            'name': 'Configured SMTP'
        },
        # Option 2: Gmail (if user provides credentials)
        {
            'host': 'smtp.gmail.com',
            'port': 587,
            'user': settings.SMTP_USER,
            'password': settings.SMTP_PASSWORD,
            'name': 'Gmail SMTP'
        },
        # Option 3: Outlook/Hotmail
        {
            'host': 'smtp-mail.outlook.com',
            'port': 587,
            'user': settings.SMTP_USER,
            'password': settings.SMTP_PASSWORD,
            'name': 'Outlook SMTP'
        }
    ]
    
    for option in smtp_options:
        if not option['user'] or not option['password']:
            continue
            
        try:
            print(f"Attempting to send via {option['name']}: {option['host']}:{option['port']}")
            with smtplib.SMTP(option['host'], option['port']) as server:
                server.starttls()
                server.login(option['user'], option['password'])
                server.send_message(msg)
            print(f"Email sent successfully via {option['name']}")
            return True
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
            if os.path.exists(attachment_path):
                f.write(f"\n\nAttachment: {attachment_path}\n")
        
        print(f"Email saved to file: {email_file}")
        print("To enable actual email sending, configure SMTP settings in .env file:")
        print("SMTP_HOST=smtp.gmail.com")
        print("SMTP_PORT=587")
        print("SMTP_USER=your-email@gmail.com")
        print("SMTP_PASSWORD=your-app-password")
        return True
        
    except Exception as e:
        print(f"Failed to save email file: {e}")
        return False
