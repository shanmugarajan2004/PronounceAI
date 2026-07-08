from fastapi import APIRouter
from app.api.v1.endpoints import analyze, consent

api_router = APIRouter()
api_router.include_router(analyze.router, prefix="/analyze", tags=["Analysis"])
api_router.include_router(consent.router, prefix="/consent", tags=["Consent"])
