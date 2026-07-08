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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
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
