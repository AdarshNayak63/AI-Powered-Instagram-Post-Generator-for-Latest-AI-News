import requests
from bs4 import BeautifulSoup
from newspaper import Article as NewspaperArticle
from datetime import datetime, timedelta
import time
import random

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
]

class ScraperService:
    def __init__(self):
        # We can define a list of base URLs to scrape
        self.base_urls = [
            "https://techcrunch.com/category/artificial-intelligence/",
            # Can add more RSS or blog pages here
        ]

    def fetch_with_retry(self, url, retries=3):
        for _ in range(retries):
            try:
                headers = {"User-Agent": random.choice(USER_AGENTS)}
                response = requests.get(url, headers=headers, timeout=10)
                if response.status_code == 200:
                    return response.text
            except requests.RequestException:
                time.sleep(random.uniform(1, 3))
        return None

    def parse_article_newspaper(self, url):
        try:
            article = NewspaperArticle(url)
            article.download()
            article.parse()
            article.nlp() # Gets summary
            return {
                "title": article.title,
                "summary": article.summary if article.summary else article.text[:200],
                "content": article.text,
                "image_url": article.top_image,
                "published_date": article.publish_date or datetime.utcnow(),
                "source_url": url
            }
        except Exception as e:
            print(f"Error parsing article {url}: {e}")
            return None

    def scrape_techcrunch(self):
        # Example specific scraper for TechCrunch
        html = self.fetch_with_retry("https://techcrunch.com/category/artificial-intelligence/")
        if not html:
            return []
            
        soup = BeautifulSoup(html, "html.parser")
        articles_data = []
        
        # Techcrunch specific article link extraction (Note: DOM structure changes often, this is a placeholder)
        for a_tag in soup.find_all("a", class_="post-block__title__link"):
            url = a_tag.get("href")
            if url:
                parsed = self.parse_article_newspaper(url)
                if parsed:
                    articles_data.append(parsed)
                    
        return articles_data

    def scrape_all(self, days_ago: int = 1):
        cutoff_date = datetime.utcnow() - timedelta(days=days_ago)
        results = []
        
        # Scrape techcrunch
        tc_articles = self.scrape_techcrunch()
        for art in tc_articles:
            # Add basic filtering
            if isinstance(art["published_date"], datetime):
                # Ensure it's timezone naive for comparison or handle timezone aware
                pub_date = art["published_date"].replace(tzinfo=None)
                if pub_date >= cutoff_date:
                    results.append(art)
            else:
                results.append(art)
                
        return results
