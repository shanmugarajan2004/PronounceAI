import subprocess
import json
import os
import logging
from app.core.config import settings
from app.core.exceptions import AudioValidationError

logger = logging.getLogger(__name__)

def validate_and_convert_audio(input_path: str, output_path: str) -> float:
    """
    Validates audio properties (size, container structure, duration) and
    converts it to a standard 16kHz, 16-bit, mono PCM WAV file.
    
    To support WebM recordings from browsers (which do not write duration 
    metadata in headers during live recording), this utility:
    1. Transcodes the input to WAV first (which decodes packets sequentially).
    2. Runs ffprobe on the generated WAV file to accurately read the duration.
    3. Enforces the 30-45s duration limit.
    """
    # 1. Size Validation
    if not os.path.exists(input_path):
        raise AudioValidationError("Audio file not found on disk.")
    
    file_size = os.path.getsize(input_path)
    if file_size > settings.MAX_CONTENT_LENGTH:
        raise AudioValidationError(
            f"File size ({file_size / (1024 * 1024):.2f}MB) exceeds the 10MB limit."
        )

    # 2. Transcode to Standard PCM WAV first via ffmpeg
    # This solves the WebM duration header issue because ffmpeg decodes packets 
    # directly and writes a fully valid container header for the output WAV file.
    ffmpeg_cmd = [
        "ffmpeg",
        "-y",               # Overwrite output files without asking
        "-i", input_path,   # Input file
        "-ar", "16000",     # Target sample rate
        "-ac", "1",         # Target channels (mono)
        "-acodec", "pcm_s16le", # Target codec (16-bit PCM)
        output_path         # Output file
    ]
    
    try:
        ffmpeg_result = subprocess.run(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        logger.info(f"Audio successfully transcoded to WAV: {output_path}")
    except FileNotFoundError:
        logger.error("FFmpeg binary not found in system PATH.")
        raise AudioValidationError(
            "FFmpeg is not installed or not configured in your system PATH. "
            "Please install FFmpeg to run pronunciation analysis locally."
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg conversion failed: {e.stderr}")
        raise AudioValidationError(
            "Uploaded file is not a valid audio recording or is corrupted."
        )

    # 3. Read duration from the transcoded WAV file using ffprobe
    ffprobe_cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json",
        output_path
    ]
    
    try:
        result = subprocess.run(
            ffprobe_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        metadata = json.loads(result.stdout)
        
        if "format" not in metadata or "duration" not in metadata["format"]:
            raise AudioValidationError("Failed to read audio duration headers from transcoded file.")
            
        duration = float(metadata["format"]["duration"])
        
    except FileNotFoundError:
        logger.error("FFprobe binary not found in system PATH.")
        raise AudioValidationError(
            "FFprobe is not installed or not configured in your system PATH. "
            "Please install FFmpeg/FFprobe to run pronunciation analysis locally."
        )
    except (subprocess.CalledProcessError, ValueError, KeyError) as e:
        logger.error(f"ffprobe validation failed on transcoded WAV: {str(e)}")
        raise AudioValidationError("Failed to validate audio duration properties.")

    # 4. Strict Duration Enforcement (30 - 45 seconds)
    if duration < settings.MIN_AUDIO_DURATION or duration > settings.MAX_AUDIO_DURATION:
        # Delete output WAV since validation failed
        try:
            if os.path.exists(output_path):
                os.remove(output_path)
        except Exception:
            pass
            
        raise AudioValidationError(
            f"Audio duration is {duration:.2f} seconds. It must be between "
            f"{settings.MIN_AUDIO_DURATION} and {settings.MAX_AUDIO_DURATION} seconds."
        )
        
    return duration
