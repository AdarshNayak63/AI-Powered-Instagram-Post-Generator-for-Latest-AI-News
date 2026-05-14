import os
from groq import Groq
from core.config import settings
import json

def get_groq_client():
    # Attempt to initialize Groq client. Will use GROQ_API_KEY from environment.
    return Groq(api_key=settings.GROQ_API_KEY)

def generate_instagram_content(article_title: str, article_summary: str, article_content: str = ""):
    client = get_groq_client()
    preferred_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    candidate_models = [
        preferred_model,
        "llama-3.1-8b-instant",
        "llama-3.3-70b-versatile"
    ]
    # Preserve order but deduplicate.
    models_to_try = list(dict.fromkeys(candidate_models))
    
    prompt = f"""
    You are writing text for a news-style Instagram card image and an Instagram caption.
    Use direct, clear language.

    Article Title: {article_title}
    Article Summary: {article_summary}
    Article Content: {article_content}

    Return ONLY valid JSON in this exact schema:
    {{
      "title": "Main headline for the card, max 9 words",
      "subtitle": "One short supporting line, max 8 words",
      "bullet_point": "One informative sentence for a bullet body (max 34 words)",
      "category": "Single word category like AI, TECH, BIKES, STARTUP",
      "alert_label": "Short uppercase label for bottom strip, max 4 words",
      "caption": "Paraphrased Instagram caption in exactly 3-4 short lines, plus one final separate hashtag line",
      "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5"
    }}
    Rules:
    - Keep card text factual and readable.
    - Caption must be a fresh paraphrase; do not copy lines from title/summary/content.
    - Caption must not repeat the headline as-is.
    - Caption must be exactly 3-4 short lines of insight/takeaway, then one final line with 4-6 relevant hashtags.
    - Caption should stay under 80 words total (including hashtags).
    - Caption tone: simple, engaging, professional.
    - No markdown.
    - No emojis.
    - Do not include keys outside this schema.
    """
    
    last_error = None
    for model_name in models_to_try:
        try:
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model_name,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            parsed = json.loads(content)
            if "title" not in parsed:
                parsed["title"] = article_title[:60]
            if "subtitle" not in parsed:
                parsed["subtitle"] = "Latest update"
            if "bullet_point" not in parsed:
                parsed["bullet_point"] = article_summary[:220]
            if "category" not in parsed:
                parsed["category"] = "AI"
            if "alert_label" not in parsed:
                parsed["alert_label"] = "NEWS ALERT"
            if "caption" not in parsed:
                parsed["caption"] = article_summary
            if "hashtags" not in parsed:
                parsed["hashtags"] = "#AI #TechNews"
            return parsed
        except Exception as e:
            last_error = e
            print(f"Groq generation failed for model '{model_name}': {e}")

    print(f"Error generating AI content, using fallback text: {last_error}")
    return {
        "title": article_title[:50] + "...",
        "subtitle": "Latest update",
        "bullet_point": article_summary[:220],
        "category": "AI",
        "alert_label": "NEWS ALERT",
        "caption": article_summary,
        "hashtags": "#AI #News"
    }
