from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from mastodon import Mastodon
import os
import json
from datetime import datetime, timedelta

router = APIRouter()

# In-memory token storage (replace with proper storage in production)
TOKEN_STORAGE = {}

class MastodonCredentials(BaseModel):
    api_base_url: str
    user_email: str
    user_pass: str

class TokenResponse(BaseModel):
    token: str
    expires_at: datetime

def get_token_storage_path():
    """Get the path to store tokens"""
    storage_dir = os.path.join(os.path.dirname(__file__), "..", "storage")
    os.makedirs(storage_dir, exist_ok=True)
    return os.path.join(storage_dir, "mastodon_tokens.json")

def load_tokens():
    """Load tokens from storage"""
    try:
        with open(get_token_storage_path(), "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_tokens(tokens):
    """Save tokens to storage"""
    with open(get_token_storage_path(), "w") as f:
        json.dump(tokens, f)

def token_is_valid(token: str) -> bool:
    """Check if a token is valid by attempting to make a simple API call"""
    try:
        # Load tokens from storage
        tokens = load_tokens()
        if token not in tokens:
            return False

        # Get token info
        token_info = tokens[token]
        if datetime.fromisoformat(token_info["expires_at"]) < datetime.now():
            return False

        # Try to make a simple API call
        mastodon = Mastodon(
            api_base_url=token_info["api_base_url"],
            access_token=token
        )
        # Try to get account info as a simple test
        mastodon.account_verify_credentials()
        return True
    except Exception:
        return False

def request_token_from_mastodon(credentials: MastodonCredentials) -> str:
    """Request a new token from Mastodon"""
    try:
        # Create app if it doesn't exist
        app_name = "social_media_observatory"
        client_id_file = os.path.join(os.path.dirname(__file__), "..", "storage", f"{app_name}_clientcred.secret")
        user_token_file = os.path.join(os.path.dirname(__file__), "..", "storage", f"{app_name}_usercred.secret")

        # Create app
        Mastodon.create_app(
            app_name,
            api_base_url=credentials.api_base_url,
            to_file=client_id_file
        )

        # Log in
        mastodon = Mastodon(client_id=client_id_file)
        mastodon.log_in(
            credentials.user_email,
            credentials.user_pass,
            to_file=user_token_file
        )

        # Get access token
        with open(user_token_file, "r") as f:
            token = f.read().strip()

        # Store token info
        tokens = load_tokens()
        tokens[token] = {
            "api_base_url": credentials.api_base_url,
            "user_email": credentials.user_email,
            "expires_at": (datetime.now() + timedelta(days=30)).isoformat()  # Tokens typically last 30 days
        }
        save_tokens(tokens)

        return token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Failed to authenticate with Mastodon: {str(e)}")

@router.post("/mastodon/authorize", response_model=TokenResponse)
async def authorize(credentials: MastodonCredentials):
    """Authorize with Mastodon and get a token"""
    token = request_token_from_mastodon(credentials)
    tokens = load_tokens()
    return TokenResponse(
        token=token,
        expires_at=datetime.fromisoformat(tokens[token]["expires_at"])
    )

@router.get("/mastodon/check")
async def check_token(token: str):
    """Check if a token is valid"""
    is_valid = token_is_valid(token)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"status": "valid"} 