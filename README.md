# Livo AI - English Speech Pronunciation Analyzer

Livo AI is a production-grade, highly secure, and DPDP-compliant web application that allows users to upload or record English speech (30–45 seconds), evaluates pronunciation acoustics, and displays real-time, word-level phonetic feedback.

It features:
- **Phonetic Assessment**: Evaluates pronunciation, fluency, completeness, and prosody/pace.
- **Word-Level Analysis**: Interactive, color-coded visual feedback (Green/Yellow/Red) showing expected vs. detected phonetic representations in International Phonetic Alphabet (IPA).
- **LLM Enrichment**: Contextual, pedagogical feedback explaining mistakes and suggesting specific target drills.
- **Micro-Playback**: Users can click individual words to replay only that time-sliced segment from their audio.
- **DPDP Act (India) Compliance**: Implements explicit consent logging, SHA-256 IP anonymization, volatile data processing (automatic file destruction), and cascading Right to Erasure.

---

## Folder Structure

```
livo-ai/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # API Endpoint Routes (v1)
│   │   ├── core/             # Config, Security, Custom Exceptions
│   │   ├── models/           # Pydantic schemas (contracts)
│   │   ├── services/         # Azure Speech, Gemini AI, Supabase client
│   │   └── utils/            # Transcoding, FFmpeg audio validation
│   ├── tests/                # Pytest unit & integration tests
│   ├── requirements.txt      # Backend dependencies
│   └── Dockerfile            # Container config (with FFmpeg runtime)
├── frontend/                 # Next.js 15 / React 19 Application
│   ├── src/
│   │   ├── app/              # App Router, Layouts, global CSS
│   │   ├── components/       # Consent Onboarding, Audio Uploader, Dashboard
│   │   ├── hooks/            # use-audio-recorder (Web Audio API analyzer)
│   │   ├── lib/              # API client and Class merger (cn)
│   │   └── types/            # TypeScript interfaces
│   ├── tailwind.config.ts    # Styling Configuration
│   └── package.json          # Frontend packages
└── README.md                 # Project README
```

---

## Technical Stack Choice

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, Lucide Icons.
- **Backend**: FastAPI (Python 3.11+), Async Native.
- **AI Processing**:
  - **Azure Speech SDK**: Unscripted pronunciation assessment (acoustic comparison).
  - **Gemini 1.5 Flash**: Structured Output enrichment for IPA targets and pedagogical suggestions.
- **Database**: Supabase PostgreSQL.
- **Dependencies**: FFmpeg & ffprobe (transcoding and duration check).

---

## Local Installation Guide

### Prerequisites
- Python 3.11+ (Python 3.13 supported)
- Node.js 18+ and npm
- **FFmpeg & ffprobe**: Must be installed on your local machine and added to your system's PATH.
  - *Windows*: Install via Chocolatey (`choco install ffmpeg`) or download from gyan.dev and add the `/bin` directory to your Environment variables.
  - *macOS*: Install via Homebrew (`brew install ffmpeg`).
  - *Linux*: Install via apt (`sudo apt-get install ffmpeg`).

### 1. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - Windows (PowerShell):
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - macOS / Linux:
     ```bash
     source venv/bin/activate
     ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Create a `.env` file in the `backend/` directory:
   ```env
   AZURE_SPEECH_KEY=your_azure_speech_key_here
   AZURE_SPEECH_REGION=your_azure_speech_region_here
   GEMINI_API_KEY=your_gemini_api_key_here
   SUPABASE_URL=your_supabase_project_url_here
   SUPABASE_KEY=your_supabase_anon_or_service_key_here
   ```
6. Run the local development server:
   ```bash
   python app/main.py
   ```
   The API will be available at `http://localhost:8000`. You can inspect interactive OpenAPI docs at `http://localhost:8000/docs`.

### 2. Database Schema Execution
Copy the contents of `backend/supabase_schema.sql` and run it inside the **SQL Editor** of your Supabase project dashboard to initialize the required tables.

### 3. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```
4. Run the frontend development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Running Automated Tests

To execute the backend unit and integration test suite (which validates audio constraints, error handling, rate blocking, and endpoint mappings):
1. Activate the backend virtual environment.
2. Run pytest:
   ```bash
   pytest backend/tests/
   ```

---

## API Documentation

### 1. Consent Registration
- **Endpoint**: `POST /api/v1/consent/`
- **Payload**:
  ```json
  {
    "consent_given": true,
    "terms_version": "v1.0",
    "device_info": "User Agent details"
  }
  ```
- **Response**: Returns a session UUID (`id`) that must accompany the speech analysis request.

### 2. Speech Analysis
- **Endpoint**: `POST /api/v1/analyze/`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `audio_file`: WebM/MP3/WAV/M4A file (30–45s).
  - `consent_id`: The UUID received from `/consent/`.

### 3. Session Erasure (Right to Erasure)
- **Endpoint**: `DELETE /api/v1/consent/{consent_id}`
- **Description**: Permanently purges consent logs and anonymized audit scores from PostgreSQL.

---

## Public Deployment Guide

### Backend (Railway / Render)
1. Link your GitHub repository to Railway or Render.
2. The platform will auto-detect the `backend/Dockerfile` and compile the app.
3. Configure the environment variables (`AZURE_SPEECH_KEY`, `GEMINI_API_KEY`, etc.) in the platform's settings dashboard.
4. Ensure the Railway/Render CORS origin configuration contains the Vercel frontend domain.

### Frontend (Vercel)
1. Link your frontend directory to Vercel.
2. Configure the build directory to `frontend/`.
3. Set the Environment Variable `NEXT_PUBLIC_API_URL` to point to your deployed backend API URL (e.g. `https://your-backend.railway.app/api/v1`).
