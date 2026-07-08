import { ConsentResponse, PronunciationAnalysisResponse } from '../types/analysis';

let rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 1. Remove any trailing slash
if (rawUrl.endsWith('/')) {
  rawUrl = rawUrl.slice(0, -1);
}

// 2. Prepend https:// if protocol is missing entirely (prevents relative path bugs)
if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
  rawUrl = `https://${rawUrl}`;
}

// 3. Ensure it terminates with the /api/v1 prefix
const BASE_URL = rawUrl.endsWith('/api/v1') ? rawUrl : `${rawUrl}/api/v1`;

export async function submitConsent(
  consentGiven: boolean,
  termsVersion: string = 'v1.0'
): Promise<ConsentResponse> {
  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'Server-Side';
  
  const response = await fetch(`${BASE_URL}/consent/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consent_given: consentGiven,
      terms_version: termsVersion,
      device_info: userAgent,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to record consent.');
  }

  return response.json();
}

export async function deleteConsent(consentId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/consent/${consentId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to delete user session.');
  }
}

export function analyzeSpeech(
  audioBlob: Blob,
  consentId: string,
  onProgress?: (percent: number) => void
): Promise<PronunciationAnalysisResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    // Check format and name the file accordingly
    let fileName = 'recording.webm';
    if (audioBlob.type.includes('wav')) fileName = 'recording.wav';
    else if (audioBlob.type.includes('mp3')) fileName = 'recording.mp3';
    else if (audioBlob.type.includes('m4a')) fileName = 'recording.m4a';

    formData.append('audio_file', audioBlob, fileName);
    formData.append('consent_id', consentId);

    // Track upload progress
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data: PronunciationAnalysisResponse = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (e) {
          reject(new Error('Failed to parse analysis response.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.detail || 'Analysis request failed.'));
        } catch (e) {
          reject(new Error(`Server error (${xhr.status}). Please try again.`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred. Ensure backend is running.'));
    };

    xhr.open('POST', `${BASE_URL}/analyze/`);
    xhr.send(formData);
  });
}
