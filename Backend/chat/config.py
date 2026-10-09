import os


class Config:
    SPACY_MODEL = os.getenv("SPACY_MODEL", "es_core_news_md")
    SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.75"))
    MAX_HISTORY = int(os.getenv("MAX_HISTORY", "20"))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
