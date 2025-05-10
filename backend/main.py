from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth.mastodon import router as mastodon_router

app = FastAPI(title="Social Media Observatory API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(mastodon_router, prefix="/auth", tags=["auth"])

@app.get("/")
async def root():
    return {"message": "Welcome to Social Media Observatory API"} 