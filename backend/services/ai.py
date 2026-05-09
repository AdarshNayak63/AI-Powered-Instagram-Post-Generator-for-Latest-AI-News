import os
from groq import Groq
from core.config import settings
import json

def get_groq_client():
    # Attempt to initialize Groq client. Will use GROQ_API_KEY from environment.
    return Groq(api_key=settings.GROQ_API_KEY)

def generate_instagram_content(article_title: str, article_summary: str, article_content: str = ""):
    client = get_groq_client()
    
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
    
    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-8b-8192", # Defaulting to a fast Llama3 model on Groq
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"Error generating AI content: {e}")
        return {
            "title": article_title[:50] + "...",
            "caption": article_summary,
            "hashtags": "#AI #News"
        }
