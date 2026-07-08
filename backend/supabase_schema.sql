-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: User Consents
-- Logs explicit user agreement to terms and speech analysis
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_given BOOLEAN NOT NULL,
    terms_version VARCHAR(50) NOT NULL,
    ip_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of user IP address for privacy
    device_info VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 2: Analysis Audit Logs
-- Minimal audit log of analysis activity. Does NOT store voice audio or transcripts.
CREATE TABLE IF NOT EXISTS analysis_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_id UUID NOT NULL REFERENCES user_consents(id) ON DELETE CASCADE,
    overall_score NUMERIC(4, 1) NOT NULL,
    duration_seconds NUMERIC(4, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for consent verification lookups (performance optimization)
CREATE INDEX IF NOT EXISTS idx_user_consents_id ON user_consents(id);
CREATE INDEX IF NOT EXISTS idx_analysis_audit_logs_consent_id ON analysis_audit_logs(consent_id);
