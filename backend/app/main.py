"""TalentProof FastAPI Application Entrypoint."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .config import settings
from .routers.api import router as api_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="TalentProof: Unified Platform connecting Candidates, Founders, HR, and Investors through verified skills, AI startup copilot, and explainable recruitment."
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API
app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/api/health")
def health_check():
    has_supabase = bool(settings.SUPABASE_URL and settings.SUPABASE_KEY)
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "mode": "supabase-relational-backend" if has_supabase else "relational-fastapi-backend",
        "supabase_configured": has_supabase,
        "supabase_url": settings.SUPABASE_URL if has_supabase else None
    }

# Frontend static files mounting
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
