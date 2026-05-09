# AI-Powered Instagram Post Generator for Latest AI News

A full-stack AI-powered web application that automates the process of scraping the latest AI news, generating engaging Instagram content using the Groq API, and creating visually appealing post designs using Python Pillow.

## Features

- **Automated Web Scraping**: Scrapes the latest AI news articles from sources like TechCrunch. Filters articles by date (Today, Yesterday, 7 Days, 10 Days).
- **AI Content Generation**: Uses the **Groq Llama 3 API** to automatically generate an engaging Instagram hook/title, a detailed caption, and relevant hashtags based on the scraped article.
- **Dynamic Image Generation**: Uses **Pillow (PIL)** to generate fully designed 1080x1080 Instagram posts. Supports multiple design templates (Modern Dark, Glassmorphism, etc.) with automatic text wrapping, image cropping, and branding overlay.
- **Modern Dashboard**: Built with **Next.js** and **TailwindCSS**, featuring a beautiful UI to preview scraped articles, edit AI-generated text, and switch between visual templates instantly.
- **Background Processing**: Uses **Celery & Redis** to handle scraping and email delivery asynchronously without blocking the user interface.

## Tech Stack

- **Frontend**: Next.js 15, React, TailwindCSS, Axios, Lucide Icons
- **Backend**: FastAPI (Python), SQLAlchemy, Pydantic
- **Database**: PostgreSQL
- **Background Workers**: Celery, Redis
- **AI / Scraping**: Groq API, BeautifulSoup4, Newspaper3k
- **Image Processing**: Pillow (Python Imaging Library)

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Highly Recommended)
- Or manually: Python 3.10+, Node.js 18+, PostgreSQL, Redis

---

## 🚀 Quick Start (Docker) - Recommended

The easiest way to run the entire application stack is using Docker Compose.

1. **Configure Environment Variables**
   Rename `.env.example` to `.env` in the root directory and fill in your API keys:
   ```bash
   GROQ_API_KEY=your_groq_api_key_here
   ```

2. **Start the Application**
   ```bash
   docker-compose up --build
   ```

3. **Access the App**
   - Frontend UI: http://localhost:3000
   - Backend API Docs (Swagger): http://localhost:5000/docs

---

## 💻 Manual Setup (Without Docker)

If you prefer to run the services manually, follow these steps:

### 1. Backend Setup

Open a terminal in the `backend/` folder:

```powershell
# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server (Runs on port 5000)
uvicorn main:app --port 5000 --reload
```

### 2. Start Background Worker (Celery)

Ensure Redis is running locally. Open a **new** terminal in the `backend/` folder, activate the virtual environment, and run:

```powershell
.\venv\Scripts\activate
celery -A worker.celery_app.celery worker --loglevel=info --pool=solo
```

### 3. Frontend Setup

Open a **new** terminal in the `frontend/` folder:

```powershell
# Install node modules
npm install

# Start the Next.js development server (Runs on port 3000)
npm run dev
```

---

## Application Flow

1. **Dashboard**: Upon loading the UI, select a date filter and click "Scrape Latest" to trigger the backend Celery scraping job.
2. **Article Feed**: Browse the scraped AI news cards. Click "Generate Post" on any article.
3. **Post Editor**: 
   - The Groq API will generate a caption and title.
   - The Pillow engine will generate an initial post image.
   - Select a different template (e.g., Glassmorphism) to dynamically regenerate the layout.
   - Edit the generated text.
4. **Export**: Enter your email and click "Send" to receive the finalized PNG image and caption in your inbox!

## Project Structure

```
├── docker-compose.yml       # Docker orchestration
├── .env                     # Environment variables
├── backend/
│   ├── api/                 # FastAPI routes (articles, generate, templates)
│   ├── core/                # Database and settings configuration
│   ├── models/              # SQLAlchemy models (Article, Post)
│   ├── schemas/             # Pydantic validation schemas
│   ├── services/            # Core logic (Scraper, Groq AI, Pillow Image Gen)
│   ├── templates/           # Pillow design templates and fonts
│   ├── worker/              # Celery background tasks
│   └── main.py              # FastAPI application entry point
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── generator/   # Post Editor UI Route
│   │   │   ├── globals.css  # Tailwind global styles
│   │   │   ├── layout.tsx   # Next.js Root Layout
│   │   │   └── page.tsx     # Main Dashboard UI
│   │   └── lib/
│   │       └── api.ts       # Axios API wrapper
│   └── package.json         # Frontend dependencies
```
