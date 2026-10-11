import os
from pathlib import Path
from pydantic import BaseModel

def _load_env_file():
    """Load key-value pairs from .env into os.environ if not already present."""
    possible_paths = [
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path.cwd() / ".env",
    ]
    for env_path in possible_paths:
        if env_path.is_file():
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip('"').strip("'")
                            if k not in os.environ:
                                os.environ[k] = v
                break
            except Exception:
                pass

_load_env_file()

class Settings(BaseModel):
    APP_NAME: str = "Idea2Impact"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    CORS_ORIGINS: list[str] = ["*"]
    
    # Supabase credentials (reads standard or Next.js public env keys)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    SUPABASE_KEY: str = (
        os.getenv("SUPABASE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    )
    SUPABASE_PUBLISHABLE_KEY: str = (
        os.getenv("SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    )
    SUPABASE_ANON_KEY: str = (
        os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or os.getenv("SUPABASE_KEY", "")
    )
    
    # Verification threshold
    VERIFICATION_PASS_SCORE: float = 75.0
    
    # Secret key for mock tokens
    SECRET_KEY: str = os.getenv("SECRET_KEY", "idea2impact-secret-jwt-key-2026")

settings = Settings()
