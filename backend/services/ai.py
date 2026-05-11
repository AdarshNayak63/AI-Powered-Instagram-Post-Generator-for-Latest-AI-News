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
    You are an expert Social Media Manager for a tech news Instagram account.
    Write an engaging, modern Instagram post about the following AI news article.

    Article Title: {article_title}
    Article Summary: {article_summary}

    Return the output strictly in the following JSON format:
    {{
        "title": "A short, catchy hook or title for the image (max 10 words)",
        "caption": "The main Instagram caption. Make it engaging, informative, and include a call to action.",
        "hashtags": "#AI #TechNews #ArtificialIntelligence #MachineLearning"
    }}
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
            return json.loads(content)
        except Exception as e:
            last_error = e
            print(f"Groq generation failed for model '{model_name}': {e}")

    print(f"Error generating AI content, using fallback text: {last_error}")
    return {
        "title": article_title[:50] + "...",
        "caption": article_summary,
        "hashtags": "#AI #News"
    }
