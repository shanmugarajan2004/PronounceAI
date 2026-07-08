# Use official slim Python base image for light container size
FROM python:3.11-slim

# Set environment paths and configurations
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_HOME=/app

WORKDIR $APP_HOME

# Install system dependencies
# ffmpeg and ffprobe are critical for audio metadata checks and wav conversions
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose port
EXPOSE 8000

# Run uvicorn server, binding to the PORT environment variable provided by Railway/Render
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
