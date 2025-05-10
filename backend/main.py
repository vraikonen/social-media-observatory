from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from fastapi.middleware.sessions import SessionMiddleware
from auth.mastodon import router as mastodon_router
import secrets
from starlette.middleware.sessions import SessionMiddleware


app = FastAPI(title="Social Media Observatory API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add session middleware for OAuth
app.add_middleware(
    SessionMiddleware,
    secret_key=secrets.token_hex(32),  # Generate a random secret key
    session_cookie="social_media_observatory_session",
    max_age=3600,  # 1 hour
    same_site="lax",
    https_only=False  # Set to True in production
)

# Include routers
app.include_router(mastodon_router, prefix="/auth", tags=["auth"])

@app.get("/")
async def root():
    return {"message": "Welcome to Social Media Observatory API"} 