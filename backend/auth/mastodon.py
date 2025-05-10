from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from mastodon import Mastodon
import os
import json
from datetime import datetime, timedelta
import requests
from urllib.parse import urlparse

router = APIRouter()

# In-memory token storage (replace with proper storage in production)
TOKEN_STORAGE = {}

class OAuthCredentials(BaseModel):
    client_id: str
    client_secret: str
    redirect_uri: str
    instance_domain: str

class TokenResponse(BaseModel):
    token: str

class CallbackRequest(BaseModel):
    code: str
    state: str
    credentials: OAuthCredentials

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

        # Try to make a simple API call
        mastodon = Mastodon(
            api_base_url=f"https://{tokens[token]['instance_domain']}",
            access_token=token
        )
        # Try to get account info as a simple test
        mastodon.account_verify_credentials()
        return True
    except Exception:
        return False

@router.post("/mastodon/callback")
async def oauth_callback(request: CallbackRequest):
    """Handle OAuth callback and exchange code for token"""
    try:
        print(f"Received code: {request.code}")  # Debug log
        print(f"Received credentials for instance: {request.credentials.instance_domain}")  # Debug log
        
        # Exchange code for token
        token_url = f"https://{request.credentials.instance_domain}/oauth/token"
        token_data = {
            'client_id': request.credentials.client_id,
            'client_secret': request.credentials.client_secret,
            'code': request.code,
            'redirect_uri': request.credentials.redirect_uri,
            'grant_type': 'authorization_code'
        }
        
        print(f"Making token request to: {token_url}")  # Debug log
        print(f"Redirect URI: {request.credentials.redirect_uri}")
        response = requests.post(token_url, data=token_data)
        
        if not response.ok:
            error_data = response.json()
            print(f"Token request failed: {error_data}")  # Debug log
            
            # If we get an invalid_grant error, check if we already have a token
            if error_data.get('error') == 'invalid_grant':
                # Try to get the existing token from storage
                tokens = load_tokens()
                # Find token for this instance
                for token, info in tokens.items():
                    if info['instance_domain'] == request.credentials.instance_domain:
                        print("Found existing token for this instance")  # Debug log
                        return TokenResponse(token=token)
            
            raise HTTPException(status_code=401, detail="Failed to exchange code for token")
        
        token_info = response.json()
        access_token = token_info['access_token']
        
        # Store token info
        tokens = load_tokens()
        tokens[access_token] = {
            'instance_domain': request.credentials.instance_domain
        }
        save_tokens(tokens)
        
        return TokenResponse(token=access_token)
    except Exception as e:
        print(f"Error in callback: {str(e)}")  # Debug log
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/mastodon/check")
async def check_token(token: str):
    """Check if a token is valid"""
    is_valid = token_is_valid(token)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"status": "valid"} 