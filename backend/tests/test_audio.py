import pytest
from unittest.mock import patch, MagicMock
import subprocess
from app.utils.audio_processing import validate_and_convert_audio
from app.core.exceptions import AudioValidationError

@patch("os.path.exists", return_value=True)
@patch("os.path.getsize", return_value=15 * 1024 * 1024) # 15MB file
def test_validate_audio_size_exceeded(mock_getsize, mock_exists):
    """
    Ensures that files exceeding the 10MB limit are immediately rejected.
    """
    with pytest.raises(AudioValidationError) as exc_info:
        validate_and_convert_audio("test.mp3", "output.wav")
    assert "exceeds the 10MB limit" in str(exc_info.value.detail)

@patch("os.path.exists", return_value=True)
@patch("os.path.getsize", return_value=2 * 1024 * 1024) # 2MB
@patch("subprocess.run")
def test_validate_audio_duration_too_short(mock_run, mock_getsize, mock_exists):
    """
    Ensures that audio files shorter than 30 seconds are rejected.
    """
    # Mock ffmpeg succeeding first, then ffprobe returning short duration
    ffmpeg_mock = MagicMock(returncode=0)
    ffprobe_mock = MagicMock(
        returncode=0,
        stdout='{"format": {"duration": "24.5"}}'
    )
    mock_run.side_effect = [ffmpeg_mock, ffprobe_mock]

    with pytest.raises(AudioValidationError) as exc_info:
        validate_and_convert_audio("test.mp3", "output.wav")
    assert "must be between 30.0 and 45.0 seconds" in str(exc_info.value.detail)

@patch("os.path.exists", return_value=True)
@patch("os.path.getsize", return_value=2 * 1024 * 1024) # 2MB
@patch("subprocess.run")
def test_validate_audio_duration_too_long(mock_run, mock_getsize, mock_exists):
    """
    Ensures that audio files longer than 45 seconds are rejected.
    """
    # Mock ffmpeg succeeding first, then ffprobe returning long duration
    ffmpeg_mock = MagicMock(returncode=0)
    ffprobe_mock = MagicMock(
        returncode=0,
        stdout='{"format": {"duration": "48.2"}}'
    )
    mock_run.side_effect = [ffmpeg_mock, ffprobe_mock]

    with pytest.raises(AudioValidationError) as exc_info:
        validate_and_convert_audio("test.wav", "output.wav")
    assert "must be between 30.0 and 45.0 seconds" in str(exc_info.value.detail)

@patch("os.path.exists", return_value=True)
@patch("os.path.getsize", return_value=2 * 1024 * 1024)
@patch("subprocess.run")
def test_validate_audio_corrupted(mock_run, mock_getsize, mock_exists):
    """
    Ensures that non-audio or malformed files fail during ffmpeg transcoding.
    """
    # Mock ffmpeg raising error (non-audio file disguised as audio)
    mock_run.side_effect = subprocess.CalledProcessError(
        returncode=1,
        cmd="ffmpeg",
        stderr="Invalid data found when processing input"
    )
    with pytest.raises(AudioValidationError) as exc_info:
        validate_and_convert_audio("fake_audio.mp3", "output.wav")
    assert "not a valid audio recording" in str(exc_info.value.detail)

@patch("os.path.exists", return_value=True)
@patch("os.path.getsize", return_value=2 * 1024 * 1024)
@patch("subprocess.run")
def test_validate_audio_success(mock_run, mock_getsize, mock_exists):
    """
    Ensures successful validation and transcoding return the correct duration.
    """
    # Mock ffmpeg first, then ffprobe succeeding
    ffmpeg_mock = MagicMock(returncode=0)
    ffprobe_mock = MagicMock(
        returncode=0,
        stdout='{"format": {"duration": "35.5"}}'
    )
    
    mock_run.side_effect = [ffmpeg_mock, ffprobe_mock]
    
    duration = validate_and_convert_audio("valid.mp3", "output.wav")
    assert duration == 35.5
    assert mock_run.call_count == 2
