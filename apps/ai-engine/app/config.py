import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    llm_provider: str = "ollama"
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    chroma_host: str = "localhost"
    chroma_port: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
