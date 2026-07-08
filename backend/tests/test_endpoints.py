import pytest
from unittest.mock import patch, MagicMock

def test_health_endpoint(client):
    """
    Checks that the service is running and reporting healthy status.
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert "Livo AI" in response.json()["project"]

@patch("app.services.supabase_client.supabase_service.create_consent_log")
def test_record_consent_success(mock_create_log, client):
    """
    Ensures consent is successfully registered in database and returns the consent ID.
    """
    mock_create_log.return_value = {
        "id": "77777777-7777-7777-7777-777777777777",
        "consent_given": True,
        "terms_version": "v1.0",
        "ip_hash": "a5e89a552bf874",
        "created_at": "2026-07-07T22:00:00+00:00"
    }

    response = client.post(
        "/api/v1/consent/",
        json={
            "consent_given": True,
            "terms_version": "v1.0",
            "device_info": "Chrome / Windows 11"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["consent_given"] is True
    assert data["id"] == "77777777-7777-7777-7777-777777777777"
    assert data["terms_version"] == "v1.0"
    assert "ip_hash" in data

def test_record_consent_declined(client):
    """
    Verifies that trying to register a negative consent results in a 400 Bad Request.
    """
    response = client.post(
        "/api/v1/consent/",
        json={
            "consent_given": False,
            "terms_version": "v1.0"
        }
    )
    assert response.status_code == 400
    assert "Consent must be granted" in response.json()["detail"]

@patch("app.services.supabase_client.supabase_service.delete_user_data")
def test_delete_consent_erasure_success(mock_delete, client):
    """
    Checks that deleting a consent record returns a 200 OK and confirms erasure.
    """
    mock_delete.return_value = True
    response = client.delete("/api/v1/consent/77777777-7777-7777-7777-777777777777")
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "permanently erased" in response.json()["message"]

@patch("app.services.supabase_client.supabase_service.delete_user_data")
def test_delete_consent_not_found(mock_delete, client):
    """
    Checks that deleting a non-existent consent record returns a 404 Not Found.
    """
    mock_delete.return_value = False
    response = client.delete("/api/v1/consent/non-existent-uuid")
    
    assert response.status_code == 404
    assert "Consent record not found" in response.json()["detail"]

@patch("app.services.supabase_client.supabase_service.verify_consent")
def test_analyze_endpoint_blocks_without_consent(mock_verify, client):
    """
    Verifies that the audio analysis endpoint rejects requests if consent is not verified.
    """
    mock_verify.return_value = False
    
    # Simulate file upload
    response = client.post(
        "/api/v1/analyze/",
        data={"consent_id": "unverified-session-id"},
        files={"audio_file": ("test.mp3", b"dummy_content", "audio/mp3")}
    )
    
    assert response.status_code == 403
    assert "consent record is required" in response.json()["detail"]
