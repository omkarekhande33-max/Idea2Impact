import hmac
import hashlib
import secrets
import time
import json
import base64
from typing import Dict, Any, Optional
from ..config import settings

def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and a unique salt."""
    salt = secrets.token_hex(16)
    iterations = 100_000
    hash_bytes = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${hash_bytes.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """Verifies a plain password against its PBKDF2-HMAC-SHA256 hash."""
    if not hashed or not password:
        return False
    try:
        parts = hashed.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = parts[2]
        expected_hex = parts[3]
        hash_bytes = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
        return hmac.compare_digest(hash_bytes.hex(), expected_hex)
    except Exception:
        return False

def create_access_token(payload: Dict[str, Any], expires_in_seconds: int = 86400 * 7) -> str:
    """Creates a cryptographically signed session token containing user claims."""
    token_data = {
        **payload,
        "exp": int(time.time()) + expires_in_seconds,
        "iat": int(time.time())
    }
    json_bytes = json.dumps(token_data, separators=(",", ":")).encode("utf-8")
    b64_data = base64.urlsafe_b64encode(json_bytes).decode("utf-8").rstrip("=")
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), b64_data.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{b64_data}.{signature}"

def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies signature and expiration of an access token."""
    if not token:
        return None
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        b64_data, signature = parts
        expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), b64_data.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        
        # Restore padding for URL-safe base64 decoding
        padded = b64_data + "=" * (-len(b64_data) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8"))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None

def verify_role_permission(user: Dict[str, Any], required_role: str) -> bool:
    """Verifies that the user role matches the required permission scope."""
    return user.get("role") == required_role or user.get("role") == "admin"

def generate_tamper_signature(data: str, secret: str = "idea2impact-secret-salt") -> str:
    """Generates an HMAC SHA-256 signature for credential tamper verification."""
    return hmac.new(secret.encode(), data.encode(), hashlib.sha256).hexdigest()
