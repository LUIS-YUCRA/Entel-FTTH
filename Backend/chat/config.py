import os


class Config:
    SPACY_MODEL = os.getenv("SPACY_MODEL", "es_core_news_md")
    SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.75"))
    MAX_HISTORY = int(os.getenv("MAX_HISTORY", "20"))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    # Compatibilidad con herramientas Python antiguas. La API Node.js es la
    # responsable de persistir los datos en la integración actual.
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
