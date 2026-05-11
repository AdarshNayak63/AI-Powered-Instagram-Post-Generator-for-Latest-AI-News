# Email Setup Guide

To enable actual email sending, configure your SMTP settings in the `.env` file:

## Gmail Setup
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

## Outlook/Hotmail Setup
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
EMAIL_FROM=your-email@outlook.com
```

## Important Notes:
1. For Gmail, you need to use an "App Password" instead of your regular password
2. Enable 2-factor authentication on your Gmail account
3. Go to Google Account settings > Security > App passwords
4. Generate a new app password and use that as SMTP_PASSWORD

## Current Status:
- Email system is configured and working
- If SMTP is not configured, emails are saved as `.eml` files for testing
- The system will show helpful setup instructions in the console when SMTP is not configured
