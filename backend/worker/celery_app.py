from celery import Celery
import os
from core.config import settings

# Load dotenv if running outside docker (optional)
# from dotenv import load_dotenv
# load_dotenv()

celery = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=['worker.tasks']
)

celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)
