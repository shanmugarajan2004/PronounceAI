import os
import tempfile
import logging
from fastapi import APIRouter, UploadFile, File, Form, Depends, status
from app.models.schemas import PronunciationAnalysisResponse
from app.core.exceptions import ConsentRequiredError, AudioValidationError
from app.utils.audio_processing import validate_and_convert_audio
from app.services.azure_speech import azure_speech_service
from app.services.gemini_enrichment import gemini_enrichment_service
from app.services.supabase_client import supabase_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/", response_model=PronunciationAnalysisResponse, status_code=status.HTTP_200_OK)
async def analyze_speech(
    audio_file: UploadFile = File(..., description="Speech recording file (MP3, WAV, WEBM, M4A)"),
    consent_id: str = Form(..., description="UUID of logged user consent (from DPDP onboarding).")
):
    """
    Orchestrates the speech pronunciation analysis pipeline:
    1. Verifies DPDP consent from the database.
    2. Securely saves the uploaded file to a temporary location.
    3. Transcodes and validates duration (30-45s) using FFmpeg.
    4. Evaluates pronunciation (phoneme & word details) using Azure Speech.
    5. Generates friendly feedback and IPA styling using Gemini.
    6. Logs an audit entry without storing speech data.
    7. Cleans up all files from disk automatically.
    """
    # 1. DPDP Consent Check
    if not supabase_service.verify_consent(consent_id):
        raise ConsentRequiredError("A valid consent record is required before speech analysis can begin.")

    # 2. Process within a secure temporary directory (auto-destructs on context exit)
    with tempfile.TemporaryDirectory() as tmp_dir:
        input_temp_path = os.path.join(tmp_dir, "input_audio")
        output_temp_wav = os.path.join(tmp_dir, "processed_audio.wav")
        
        # Save uploaded file to temp file
        try:
            contents = await audio_file.read()
            # Early size check (avoid consuming memory/writing large files)
            if len(contents) > 10 * 1024 * 1024:
                raise AudioValidationError("Uploaded file exceeds the maximum size limit of 10MB.")
                
            with open(input_temp_path, "wb") as f:
                f.write(contents)
        except IOError as e:
            logger.error(f"Failed to write uploaded file to disk: {str(e)}")
            raise AudioValidationError("Failed to temporarily process the uploaded file.")
        finally:
            await audio_file.close()

        # 3. Audio Validation & Transcoding
        # Duration check (30-45s) and 16kHz PCM WAV conversion
        duration_seconds = validate_and_convert_audio(input_temp_path, output_temp_wav)

        # 4. Azure speech pronunciation assessment (Unscripted)
        azure_result = azure_speech_service.analyze_audio(output_temp_wav)

        # 5. Gemini enrichment (LLM explanation of mistakes & suggestions)
        enriched_result = gemini_enrichment_service.enrich_pronunciation_result(
            transcript=azure_result["transcript"],
            words=azure_result["words"]
        )

        # 6. DPDP Audit logging
        supabase_service.log_analysis_audit(
            consent_id=consent_id,
            overall_score=azure_result["overall_score"],
            duration_seconds=duration_seconds
        )

        # 7. Build API Response
        return PronunciationAnalysisResponse(
            overall_score=azure_result["overall_score"],
            breakdown=azure_result["breakdown"],
            words=enriched_result["enriched_words"],
            general_suggestions=enriched_result["general_suggestions"],
            transcript=azure_result["transcript"]
        )
