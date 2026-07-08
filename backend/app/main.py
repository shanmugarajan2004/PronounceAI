from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for speech pronunciation assessment, supporting DPDP audit logging, WAV transcoding, Azure Speech assessment, and Gemini response enrichment.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS Middleware
# Allows safe cross-origin resource sharing with configured origins (e.g. localhost, Vercel frontend)
origins = settings.ALLOWED_ORIGINS
import os
import json
env_cors = os.environ.get("CORS_ORIGINS") or os.environ.get("ALLOWED_ORIGINS")
if env_cors:
    try:
        # Try parsing as JSON list
        parsed = json.loads(env_cors)
        if isinstance(parsed, list):
            origins = parsed
        else:
            origins = [str(parsed)]
    except Exception:
        # Fallback to comma-separated list
        origins = [o.strip() for o in env_cors.split(",") if o.strip()]

# Wildcards "*" cannot be used with allow_credentials=True in CORS standards
allow_credentials = True
if "*" in origins or not origins:
    allow_credentials = False
    if not origins:
        origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints under API version prefix (e.g. /api/v1)
app.include_router(api_router, prefix=settings.API_V1_STR)

# Custom exception handler for validation and generic server errors
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log the full exception for engineering diagnostics (production security practice: hide internal details from user)
    import logging
    logging.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

@app.get("/health")
def health_check():
    """
    Health check endpoint for container environments and deployment verification.
    """
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    # Local development runner
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
