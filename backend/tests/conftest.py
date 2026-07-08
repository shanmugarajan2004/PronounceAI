import os
import sys

# 1. Set mock environment variables before importing app configurations
os.environ["AZURE_SPEECH_KEY"] = "mock_azure_speech_key_12345"
os.environ["AZURE_SPEECH_REGION"] = "eastus"
os.environ["GEMINI_API_KEY"] = "mock_gemini_api_key_abcde"
os.environ["SUPABASE_URL"] = "https://mockproject.supabase.co"
os.environ["SUPABASE_KEY"] = "mock_supabase_service_key_98765"

# Ensure the app folder is in the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    """
    FastAPI client fixture for making HTTP requests during integration tests.
    """
    with TestClient(app) as c:
        yield c
