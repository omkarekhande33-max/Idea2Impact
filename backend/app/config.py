import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "Idea2Impact"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    CORS_ORIGINS: list[str] = ["*"]
    
    # Supabase credentials (optional: defaults to local relational store)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # Verification threshold
    VERIFICATION_PASS_SCORE: float = 75.0
    
    # Secret key for mock tokens
    SECRET_KEY: str = os.getenv("SECRET_KEY", "idea2impact-secret-jwt-key-2026")

settings = Settings()
