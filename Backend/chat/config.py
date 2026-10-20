import os


class Config:
    SPACY_MODEL = os.getenv("SPACY_MODEL", "es_core_news_md")
    SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.75"))
    MAX_HISTORY = int(os.getenv("MAX_HISTORY", "20"))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    GREETING_MORNING_HOUR = int(os.getenv("GREETING_MORNING_HOUR", "5"))
    GREETING_AFTERNOON_HOUR = int(os.getenv("GREETING_AFTERNOON_HOUR", "12"))
    GREETING_NIGHT_HOUR = int(os.getenv("GREETING_NIGHT_HOUR", "19"))
