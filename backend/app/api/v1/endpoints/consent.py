from fastapi import APIRouter, Request, HTTPException, status
from app.models.schemas import ConsentCreate, ConsentResponse
from app.services.supabase_client import supabase_service

router = APIRouter()

@router.post("/", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
async def record_consent(consent_in: ConsentCreate, request: Request):
    """
    Log explicit user consent for audio analysis.
    Resolves client IP (handling reverse proxies), hashes it, and logs it.
    """
    if not consent_in.consent_given:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent must be granted to use the speech pronunciation analysis features."
        )

    # Resolve IP address behind reverse proxies (Railway, Render, Vercel etc.)
    ip_address = request.headers.get("x-forwarded-for")
    if ip_address:
        # Get first IP in comma-separated list
        ip_address = ip_address.split(",")[0].strip()
    else:
        ip_address = request.client.host if request.client else "127.0.0.1"

    # Save to DB
    result = supabase_service.create_consent_log(
        consent_given=consent_in.consent_given,
        terms_version=consent_in.terms_version,
        ip_address=ip_address,
        device_info=consent_in.device_info
    )

    return ConsentResponse(
        id=str(result["id"]),
        consent_given=result["consent_given"],
        terms_version=result["terms_version"],
        timestamp=result["created_at"],
        ip_hash=result["ip_hash"]
    )

@router.delete("/{consent_id}", status_code=status.HTTP_200_OK)
async def delete_consent(consent_id: str):
    """
    Implements Right to Erasure (DPDP Section 12).
    Deletes the consent log and cascaded audit records.
    """
    success = supabase_service.delete_user_data(consent_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consent record not found or already deleted."
        )
    return {"status": "success", "message": "All data associated with this session has been permanently erased."}
