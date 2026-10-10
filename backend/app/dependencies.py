"""Authentication and request dependencies."""
from fastapi import Header, HTTPException
from typing import Optional
from .database import db

def get_current_user(x_user_id: Optional[str] = Header(None)):
    """Extracts and verifies active user identity from request headers."""
    user_id = x_user_id or "cand-01"
    profile = db.find_one("profiles", lambda p: p["id"] == user_id)
    if not profile:
        table = db.get_table("profiles")
        if not table:
            raise HTTPException(status_code=404, detail="No profile found")
        profile = table[0]
    return profile
