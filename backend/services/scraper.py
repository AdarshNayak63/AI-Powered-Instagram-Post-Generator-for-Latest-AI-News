import requests
from bs4 import BeautifulSoup
from newspaper import Article as NewspaperArticle
from datetime import datetime, timedelta
import time
import random
from urllib.parse import urljoin, urlparse

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
]

class ScraperService:
    def __init__(self):
        self.base_urls = [
            "https://www.artificialintelligence-news.com/",
            "https://techcrunch.com/category/artificial-intelligence/",
            "https://www.wsj.com/tech/ai",
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

    def _extract_candidate_links(self, html, base_url):
        soup = BeautifulSoup(html, "html.parser")
        links = []
        seen = set()

        selectors = [
            "article a[href]",
            "h1 a[href]",
            "h2 a[href]",
            "h3 a[href]",
            "a.post-card__title-link[href]",
            "a.loop-card__title-link[href]",
            "a[href*='/202']",
        ]

        for selector in selectors:
            for a_tag in soup.select(selector):
                href = (a_tag.get("href") or "").strip()
                if not href:
                    continue
                full_url = urljoin(base_url, href)
                parsed = urlparse(full_url)
                if parsed.scheme not in ("http", "https"):
                    continue
                if parsed.netloc and parsed.netloc not in urlparse(base_url).netloc and "wsj.com" not in parsed.netloc:
                    continue
                # Basic cleanup to avoid tag/category/archive pages.
                lower = full_url.lower()
                if any(x in lower for x in ["/tag/", "/author/", "/category/", "/all-categories/", "/about/", "/contact/"]):
                    continue
                if full_url in seen:
                    continue
                seen.add(full_url)
                links.append(full_url)

        return links[:20]

    def _parse_article_fallback(self, url):
        try:
            html = self.fetch_with_retry(url, retries=2)
            if not html:
                return None
            soup = BeautifulSoup(html, "html.parser")
            title_tag = soup.find("meta", property="og:title") or soup.find("title")
            desc_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", property="og:description")
            image_tag = soup.find("meta", property="og:image")

            title = title_tag.get("content") if title_tag and title_tag.has_attr("content") else (title_tag.get_text(strip=True) if title_tag else "")
            summary = desc_tag.get("content") if desc_tag and desc_tag.has_attr("content") else ""
            image_url = image_tag.get("content") if image_tag and image_tag.has_attr("content") else ""

            if not title:
                return None

            return {
                "title": title,
                "summary": summary[:500] if summary else title,
                "content": summary or title,
                "image_url": image_url,
                "published_date": datetime.utcnow(),
                "source_url": url
            }
        except Exception as e:
            print(f"Fallback parse failed for {url}: {e}")
            return None

    def _scrape_source(self, source_url):
        html = self.fetch_with_retry(source_url)
        if not html:
            return []

        candidate_links = self._extract_candidate_links(html, source_url)
        articles_data = []
        for url in candidate_links:
            parsed = self.parse_article_newspaper(url)
            if not parsed:
                parsed = self._parse_article_fallback(url)
            if not parsed:
                continue
            # Keep only entries with useful fields
            if not parsed.get("title") or not parsed.get("source_url"):
                continue
            articles_data.append(parsed)

        return articles_data

    def scrape_all(self, days_ago: int = 1):
        cutoff_date = datetime.utcnow() - timedelta(days=days_ago)
        results = []
        seen_urls = set()

        for source in self.base_urls:
            source_articles = self._scrape_source(source)
            for art in source_articles:
                src = art.get("source_url")
                if not src or src in seen_urls:
                    continue
                seen_urls.add(src)

                published = art.get("published_date")
                if isinstance(published, datetime):
                    pub_date = published.replace(tzinfo=None)
                    if pub_date >= cutoff_date:
                        results.append(art)
                else:
                    results.append(art)

        return results
