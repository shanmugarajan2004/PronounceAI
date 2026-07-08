from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "Livo AI Speech Pronunciation Analyzer"
    API_V1_STR: str = "/api/v1"

    # Azure Speech Service Configurations
    AZURE_SPEECH_KEY: str = Field("mock", description="Azure Speech subscription key")
    AZURE_SPEECH_REGION: str = Field("mock", description="Azure Speech service region (e.g. eastus)")

    # Gemini LLM Configurations
    GEMINI_API_KEY: str = Field("mock", description="Google Gemini API key")

    # Supabase DB Configurations (for Audit & Consent logging)
    SUPABASE_URL: str = Field("https://mockproject.supabase.co", description="Supabase project URL")
    SUPABASE_KEY: str = Field("mock", description="Supabase service role or anon key")

    # Security Configurations
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="List of origins allowed to make CORS requests to the API"
    )
    
    # Audio settings
    MAX_CONTENT_LENGTH: int = 10 * 1024 * 1024  # 10MB limit
    MIN_AUDIO_DURATION: float = 30.0            # seconds
    MAX_AUDIO_DURATION: float = 45.0            # seconds

settings = Settings()
