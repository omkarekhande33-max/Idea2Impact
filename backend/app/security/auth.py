import hmac
import hashlib
from typing import Dict, Any

def verify_role_permission(user: Dict[str, Any], required_role: str) -> bool:
    """Verifies that the user role matches the required permission scope."""
    return user.get("role") == required_role or user.get("role") == "admin"

def generate_tamper_signature(data: str, secret: str = "idea2impact-secret-salt") -> str:
    """Generates an HMAC SHA-256 signature for credential tamper verification."""
    return hmac.new(secret.encode(), data.encode(), hashlib.sha256).hexdigest()
