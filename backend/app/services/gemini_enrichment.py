import google.generativeai as genai
import json
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.core.config import settings
from app.core.exceptions import AIServiceError

logger = logging.getLogger(__name__)

# Configure the Gemini SDK
try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception as e:
    logger.error(f"Failed to configure Gemini SDK: {str(e)}")

# Define the Pydantic models for Structured Output
class WordCorrection(BaseModel):
    word_index: int = Field(..., description="The index of the word in the original chronological word list.")
    explanation: str = Field(..., description="Friendly explanation of the pronunciation mistake (e.g., 'You silent-ed the letter b' or 'vowel stress error').")
    suggestion: str = Field(..., description="Learner-friendly advice with IPA targets and visual rhyming hints.")

class EnrichmentResponse(BaseModel):
    word_corrections: List[WordCorrection] = Field(..., description="List of corrections for each mispronounced word.")
    general_suggestions: List[str] = Field(..., description="2-3 actionable general tips for fluency, pace, or overall speech.")

class GeminiEnrichmentService:
    def __init__(self):
        self.model_name = "gemini-1.5-flash"  # Standard, highly cost-effective model with native JSON schema support
        self.api_key = settings.GEMINI_API_KEY
        # Detect placeholders and force mock mode
        if (not self.api_key or 
            "your_" in self.api_key.lower() or 
            "placeholder" in self.api_key.lower() or 
            len(self.api_key) < 10):
            self.api_key = "mock"

    def enrich_pronunciation_result(
        self,
        transcript: str,
        words: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Enriches the word-level assessment results with LLM explanations and suggestions.
        """
        # Filter down to words that have mistakes to save tokens and focus LLM attention
        error_words_metadata = []
        for idx, word_data in enumerate(words):
            if word_data.get("error_type", "None") != "None":
                # Create a concise package for the LLM
                phoneme_details = [
                    f"'{ph['phoneme']}' (accuracy: {ph['accuracy_score']}, error: {ph['error_type']})"
                    for ph in word_data.get("phonemes", [])
                ]
                error_words_metadata.append({
                    "word_index": idx,
                    "word": word_data.get("word", ""),
                    "error_type": word_data.get("error_type"),
                    "accuracy_score": word_data.get("accuracy_score"),
                    "phonemes": phoneme_details
                })

        # If there are no mistakes, skip calling the LLM for individual corrections
        if not error_words_metadata:
            return {
                "enriched_words": words,
                "general_suggestions": [
                    "Fantastic job! Your pronunciation is incredibly clear and accurate.",
                    "To push your speaking skills further, try recording conversational speech without a script to practice natural phrasing.",
                    "Focus on maintaining this level of confidence and natural pace in real-world discussions."
                ]
            }

        # Build prompt
        prompt = f"""
You are an expert English Speech Pronunciation Coach and ESL (English as a Second Language) Technical Interview Mentor.
Your role is to analyze speech pronunciation errors and provide highly actionable, empathetic, and clear feedback.

Full Transcript Spoken:
"{transcript}"

Words identified with errors:
{json.dumps(error_words_metadata, indent=2)}

Task:
For each word listed in the errors, review the phoneme-level grading. Generate:
1. `explanation`: A clear explanation of what went wrong (e.g. "You replaced the short 'o' sound with a long 'o' sound, making 'dog' sound like 'dogue'.")
2. `suggestion`: Direct practice advice. State the correct IPA pronunciation clearly (e.g., /dɒɡ/) and provide a visual or rhyming hint (e.g., "Keep it short, rhyming with 'log' and 'fog'.")

In addition, write 2 or 3 high-level `general_suggestions` to help the user improve their pacing, flow, or common pronunciation patterns observed.

Constraints:
- Be encouraging and supportive.
- Do NOT output formatting markdown tags inside your Pydantic properties.
- Ensure the `word_index` matches the exact word_index provided in the input.
"""

        # Check for Mock Mode
        if self.api_key == "mock":
            logger.info("Gemini Enrichment is in mock mode. Returning mock data.")
            enrichment_data = {
                "word_corrections": [
                    {
                        "word_index": 2,
                        "explanation": "The diphthong /aʊ/ in 'brown' was mispronounced. It sounded flat, resembling the simple /oʊ/ vowel.",
                        "suggestion": "Try rounding your mouth more as you glide the vowel. Say /braʊn/, making it rhyme with 'town' and 'down'."
                    },
                    {
                        "word_index": 7,
                        "explanation": "The vowel sound /eɪ/ in 'lazy' was slightly truncated, sounding like the short /e/ in 'let'.",
                        "suggestion": "Focus on elongating the first syllable: /leɪzi/. Make it rhyme with 'crazy' and 'hazy'."
                    }
                ],
                "general_suggestions": [
                    "Pay attention to elongating diphthongs such as the /aʊ/ sound in 'brown' and /eɪ/ in 'lazy'.",
                    "Practice smooth vocal sustainment at the end of clauses to improve your completeness score.",
                    "Your timing and pause lengths are excellent. Maintain this speaking pace to sound clear and natural."
                ]
            }
        else:
            try:
                model = genai.GenerativeModel(self.model_name)
                
                # Call Gemini enforcing the JSON schema structure
                response = model.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=EnrichmentResponse,
                        temperature=0.2  # Low temperature for deterministic pedagogical results
                    )
                )
                
                # Parse the structured response
                enrichment_data = json.loads(response.text)
                
            except Exception as e:
                logger.error(f"Gemini API enrichment failed: {str(e)}", exc_info=True)
                # Graceful degradation: return original words and basic suggestions so the app doesn't crash
                return {
                    "enriched_words": words,
                    "general_suggestions": [
                        "Ensure you enunciate consonants clearly at the end of words.",
                        "Practice breathing pauses between sentences to improve natural fluency."
                    ]
                }

        # Merge the corrections back into our main word list
        corrections_map = {c["word_index"]: c for c in enrichment_data.get("word_corrections", [])}
        
        enriched_words = []
        for idx, word_data in enumerate(words):
            word_copy = dict(word_data)
            
            # 1. Start with values already populated by the speech service
            expected_ipa = word_data.get("expected_pronunciation")
            detected_ipa = word_data.get("detected_pronunciation")
            
            # 2. If missing, attempt to derive them from the phonemes list dynamically
            if not expected_ipa or not detected_ipa:
                try:
                    phonemes = word_data.get("phonemes", [])
                    if phonemes:
                        derived_expected = "".join([ph.get("ipa", "") for ph in phonemes])
                        
                        derived_detected = []
                        for ph in phonemes:
                            if ph.get("error_type") == "Substitution":
                                # Mark substitution character or use it
                                derived_detected.append(ph.get("ipa", "?"))
                            else:
                                derived_detected.append(ph.get("ipa", ""))
                        
                        if not expected_ipa:
                            expected_ipa = derived_expected if derived_expected else None
                        if not detected_ipa:
                            detected_ipa = "".join(derived_detected) if derived_expected else None
                except Exception:
                    pass
            
            word_copy["expected_pronunciation"] = expected_ipa
            word_copy["detected_pronunciation"] = detected_ipa
            
            # 3. Default empty explanation/suggestion, override if correction exists
            word_copy["explanation"] = None
            word_copy["suggestion"] = None
            
            if idx in corrections_map:
                corr = corrections_map[idx]
                word_copy["explanation"] = corr.get("explanation")
                word_copy["suggestion"] = corr.get("suggestion")
            
            enriched_words.append(word_copy)

        return {
            "enriched_words": enriched_words,
            "general_suggestions": enrichment_data.get("general_suggestions", [])
        }

# Singleton instance
gemini_enrichment_service = GeminiEnrichmentService()
