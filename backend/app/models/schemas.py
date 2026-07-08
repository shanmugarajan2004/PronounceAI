from pydantic import BaseModel, Field
from typing import List, Optional

class ConsentCreate(BaseModel):
    consent_given: bool = Field(..., description="Whether the user has explicitly consented to audio collection and analysis under DPDP rules.")
    terms_version: str = Field("v1.0", description="Version of terms and privacy policy accepted by the user.")
    device_info: Optional[str] = Field(None, description="Anonymized user agent or device type details.")

class ConsentResponse(BaseModel):
    id: str
    consent_given: bool
    terms_version: str
    timestamp: str
    ip_hash: str

class PhonemeFeedback(BaseModel):
    phoneme: str = Field(..., description="The standard phonetic representation of the phoneme (e.g., 't', 'ae').")
    ipa: Optional[str] = Field(None, description="International Phonetic Alphabet (IPA) representation of the phoneme.")
    accuracy_score: float = Field(..., ge=0, le=100, description="Pronunciation score for the phoneme from 0 to 100.")
    error_type: str = Field(..., description="Error classification: 'None', 'Substitution', 'Omission', 'Insertion', or 'Mispronunciation'.")

class WordFeedback(BaseModel):
    word: str = Field(..., description="The target text word.")
    accuracy_score: float = Field(..., ge=0, le=100, description="Overall accuracy score of the word.")
    error_type: str = Field(..., description="Error classification: 'None', 'Substitution', 'Omission', or 'Insertion'.")
    start_offset: int = Field(..., description="Start position of the word in milliseconds from the start of the audio.")
    duration: int = Field(..., description="Duration of the word in milliseconds.")
    phonemes: List[PhonemeFeedback] = Field(default=[], description="List of phonemes that compose this word and their individual evaluations.")
    expected_pronunciation: Optional[str] = Field(None, description="The correct phonetic representation expected.")
    detected_pronunciation: Optional[str] = Field(None, description="The actual phonetic representation spoken by the user.")
    explanation: Optional[str] = Field(None, description="LLM-enriched friendly explanation of why this was mispronounced.")
    suggestion: Optional[str] = Field(None, description="LLM-enriched suggestion on how to improve the pronunciation of this word.")

class ScoringBreakdown(BaseModel):
    pronunciation: float = Field(..., ge=0, le=100, description="Word pronunciation accuracy score.")
    fluency: float = Field(..., ge=0, le=100, description="Smoothness and flow of speech.")
    completeness: float = Field(..., ge=0, le=100, description="Proportion of spoken words against reference text.")
    prosody: float = Field(..., ge=0, le=100, description="Intonation, stress patterns, and rhythm.")

class PronunciationAnalysisResponse(BaseModel):
    overall_score: float = Field(..., ge=0, le=100, description="Weighted composite pronunciation score.")
    breakdown: ScoringBreakdown = Field(..., description="Breakdown of individual grading components.")
    words: List[WordFeedback] = Field(..., description="Chronological feedback for each word spoken.")
    general_suggestions: List[str] = Field(..., description="High-level pedagogical suggestions for the speaker's overall speech.")
    transcript: str = Field(..., description="The complete text transcribed from the speech.")
