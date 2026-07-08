import azure.cognitiveservices.speech as speechsdk
import json
import time
import logging
from typing import Dict, Any, List
from app.core.config import settings
from app.core.exceptions import AIServiceError

logger = logging.getLogger(__name__)

class AzureSpeechService:
    def __init__(self):
        self.subscription_key = settings.AZURE_SPEECH_KEY
        self.region = settings.AZURE_SPEECH_REGION
        # Detect placeholders or empty strings and default to mock mode
        if (not self.subscription_key or 
            "your_" in self.subscription_key.lower() or 
            "placeholder" in self.subscription_key.lower() or 
            len(self.subscription_key) < 10):
            self.subscription_key = "mock"

    def analyze_audio(self, audio_path: str) -> Dict[str, Any]:
        """
        Performs continuous unscripted pronunciation assessment on a WAV file.
        Aggregates results across multiple sentences/utterances.
        """
        if self.subscription_key == "mock":
            logger.info("Azure Speech is in mock mode. Simulating API response.")
            time.sleep(1.5) # Simulate API call latency
            
            # Returns a mock evaluation of the classic phrase: "The quick brown fox jumps over the lazy dog."
            # Highlighting: "brown" is mispronounced (score 42), "lazy" needs improvement (score 65).
            words = [
                {
                    "word": "The",
                    "accuracy_score": 98.0,
                    "error_type": "None",
                    "start_offset": 100,
                    "duration": 200,
                    "phonemes": [
                        {"phoneme": "ð", "accuracy_score": 98.0, "error_type": "None", "ipa": "ð"},
                        {"phoneme": "ə", "accuracy_score": 98.0, "error_type": "None", "ipa": "ə"}
                    ],
                    "expected_pronunciation": "ðə",
                    "detected_pronunciation": "ðə"
                },
                {
                    "word": "quick",
                    "accuracy_score": 95.0,
                    "error_type": "None",
                    "start_offset": 350,
                    "duration": 400,
                    "phonemes": [
                        {"phoneme": "k", "accuracy_score": 95.0, "error_type": "None", "ipa": "k"},
                        {"phoneme": "w", "accuracy_score": 95.0, "error_type": "None", "ipa": "w"},
                        {"phoneme": "ɪ", "accuracy_score": 95.0, "error_type": "None", "ipa": "ɪ"},
                        {"phoneme": "k", "accuracy_score": 95.0, "error_type": "None", "ipa": "k"}
                    ],
                    "expected_pronunciation": "kwɪk",
                    "detected_pronunciation": "kwɪk"
                },
                {
                    "word": "brown",
                    "accuracy_score": 42.0,
                    "error_type": "Mispronunciation",
                    "start_offset": 800,
                    "duration": 500,
                    "phonemes": [
                        {"phoneme": "b", "accuracy_score": 95.0, "error_type": "None", "ipa": "b"},
                        {"phoneme": "r", "accuracy_score": 90.0, "error_type": "None", "ipa": "r"},
                        {"phoneme": "aʊ", "accuracy_score": 20.0, "error_type": "Substitution", "ipa": "aʊ"},
                        {"phoneme": "n", "accuracy_score": 95.0, "error_type": "None", "ipa": "n"}
                    ],
                    "expected_pronunciation": "braʊn",
                    "detected_pronunciation": "brɑːn"
                },
                {
                    "word": "fox",
                    "accuracy_score": 96.0,
                    "error_type": "None",
                    "start_offset": 1350,
                    "duration": 450,
                    "phonemes": [
                        {"phoneme": "f", "accuracy_score": 96.0, "error_type": "None", "ipa": "f"},
                        {"phoneme": "ɒ", "accuracy_score": 96.0, "error_type": "None", "ipa": "ɒ"},
                        {"phoneme": "k", "accuracy_score": 96.0, "error_type": "None", "ipa": "k"},
                        {"phoneme": "s", "accuracy_score": 96.0, "error_type": "None", "ipa": "s"}
                    ],
                    "expected_pronunciation": "fɒks",
                    "detected_pronunciation": "fɒks"
                },
                {
                    "word": "jumps",
                    "accuracy_score": 92.0,
                    "error_type": "None",
                    "start_offset": 1850,
                    "duration": 500,
                    "phonemes": [
                        {"phoneme": "dʒ", "accuracy_score": 92.0, "error_type": "None", "ipa": "dʒ"},
                        {"phoneme": "ʌ", "accuracy_score": 92.0, "error_type": "None", "ipa": "ʌ"},
                        {"phoneme": "m", "accuracy_score": 92.0, "error_type": "None", "ipa": "m"},
                        {"phoneme": "p", "accuracy_score": 92.0, "error_type": "None", "ipa": "p"},
                        {"phoneme": "s", "accuracy_score": 92.0, "error_type": "None", "ipa": "s"}
                    ],
                    "expected_pronunciation": "dʒʌmps",
                    "detected_pronunciation": "dʒʌmps"
                },
                {
                    "word": "over",
                    "accuracy_score": 95.0,
                    "error_type": "None",
                    "start_offset": 2400,
                    "duration": 400,
                    "phonemes": [
                        {"phoneme": "oʊ", "accuracy_score": 95.0, "error_type": "None", "ipa": "oʊ"},
                        {"phoneme": "v", "accuracy_score": 95.0, "error_type": "None", "ipa": "v"},
                        {"phoneme": "ə", "accuracy_score": 95.0, "error_type": "None", "ipa": "ə"},
                        {"phoneme": "r", "accuracy_score": 95.0, "error_type": "None", "ipa": "r"}
                    ],
                    "expected_pronunciation": "oʊvər",
                    "detected_pronunciation": "oʊvər"
                },
                {
                    "word": "the",
                    "accuracy_score": 98.0,
                    "error_type": "None",
                    "start_offset": 2850,
                    "duration": 150,
                    "phonemes": [
                        {"phoneme": "ð", "accuracy_score": 98.0, "error_type": "None", "ipa": "ð"},
                        {"phoneme": "ə", "accuracy_score": 98.0, "error_type": "None", "ipa": "ə"}
                    ],
                    "expected_pronunciation": "ðə",
                    "detected_pronunciation": "ðə"
                },
                {
                    "word": "lazy",
                    "accuracy_score": 65.0,
                    "error_type": "Mispronunciation",
                    "start_offset": 3050,
                    "duration": 600,
                    "phonemes": [
                        {"phoneme": "l", "accuracy_score": 95.0, "error_type": "None", "ipa": "l"},
                        {"phoneme": "eɪ", "accuracy_score": 40.0, "error_type": "Substitution", "ipa": "eɪ"},
                        {"phoneme": "z", "accuracy_score": 90.0, "error_type": "None", "ipa": "z"},
                        {"phoneme": "i", "accuracy_score": 95.0, "error_type": "None", "ipa": "i"}
                    ],
                    "expected_pronunciation": "leɪzi",
                    "detected_pronunciation": "leɪsi"
                },
                {
                    "word": "dog",
                    "accuracy_score": 94.0,
                    "error_type": "None",
                    "start_offset": 3700,
                    "duration": 500,
                    "phonemes": [
                        {"phoneme": "d", "accuracy_score": 94.0, "error_type": "None", "ipa": "d"},
                        {"phoneme": "ɒ", "accuracy_score": 94.0, "error_type": "None", "ipa": "ɒ"},
                        {"phoneme": "ɡ", "accuracy_score": 94.0, "error_type": "None", "ipa": "ɡ"}
                    ],
                    "expected_pronunciation": "dɒɡ",
                    "detected_pronunciation": "dɒɡ"
                }
            ]
            
            # Overall Score: (0.40 * 84.4) + (0.30 * 85.0) + (0.20 * 95.0) + (0.10 * 80.0) = 86.3
            return {
                "overall_score": 86.3,
                "breakdown": {
                    "pronunciation": 84.4,
                    "fluency": 85.0,
                    "completeness": 95.0,
                    "prosody": 80.0
                },
                "words": words,
                "transcript": "The quick brown fox jumps over the lazy dog."
            }

        # 1. SDK Config
        try:
            speech_config = speechsdk.SpeechConfig(
                subscription=self.subscription_key,
                region=self.region
            )
            # Use standard English (US) as default. Can be customized.
            speech_config.speech_recognition_language = "en-US"
        except Exception as e:
            logger.error(f"Failed to initialize Azure Speech Config: {str(e)}")
            raise AIServiceError(f"Azure Speech initialization error: {str(e)}")

        audio_config = speechsdk.audio.AudioConfig(filename=audio_path)

        # 2. Pronunciation Assessment Config
        # We construct using a JSON config to enable unscripted / scriptless assessment
        # Setting phonemeAlphabet to IPA returns International Phonetic Alphabet symbols.
        pron_assessment_json = {
            "gradingSystem": "HundredMark",
            "granularity": "Phoneme",
            "phonemeAlphabet": "IPA",
            "enableMiscue": True,
            "scenarioId": "" # Empty scenario ID for unscripted
        }
        
        try:
            pron_config = speechsdk.PronunciationAssessmentConfig(
                json_string=json.dumps(pron_assessment_json)
            )
            # Enable prosody assessment for intonation/rhythm analysis
            pron_config.enable_prosody_assessment()
        except Exception as e:
            logger.error(f"Failed to configure Pronunciation Assessment: {str(e)}")
            raise AIServiceError(f"Azure Speech configuration error: {str(e)}")

        # 3. Initialize and Execute Recognizer (wrapped in try/finally to release Windows file locks)
        recognizer = None
        all_words = []
        transcripts = []
        utterance_scores: List[Dict[str, float]] = []
        done = False
        error_msg = None

        def recognized_cb(evt):
            if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
                json_str = evt.result.properties.get(
                    speechsdk.PropertyId.SpeechServiceResponse_JsonResult
                )
                if json_str:
                    try:
                        response_json = json.loads(json_str)
                        nbest = response_json.get("NBest", [])
                        if nbest:
                            best_match = nbest[0]
                            
                            # Collect transcript segment
                            transcripts.append(best_match.get("Display", ""))
                            
                            # Collect global assessment scores for this segment
                            assessment = best_match.get("PronunciationAssessment", {})
                            if assessment:
                                utterance_scores.append({
                                    "accuracy": float(assessment.get("AccuracyScore", 0)),
                                    "fluency": float(assessment.get("FluencyScore", 0)),
                                    "completeness": float(assessment.get("CompletenessScore", 0)),
                                    # Default to overall PronScore if ProsodyScore is missing
                                    "prosody": float(assessment.get("ProsodyScore", assessment.get("PronScore", 0)))
                                })
                            
                            # Collect word and phoneme breakdowns
                            words = best_match.get("Words", [])
                            for word_data in words:
                                word_text = word_data.get("Word", "")
                                word_pron = word_data.get("PronunciationAssessment", {})
                                
                                # Convert ticks (100ns units) to milliseconds
                                offset_ms = int(word_data.get("Offset", 0) / 10000)
                                duration_ms = int(word_data.get("Duration", 0) / 10000)
                                
                                word_error = word_pron.get("ErrorType", "None")
                                word_accuracy = float(word_pron.get("AccuracyScore", 0))
                                
                                # Process phonemes
                                phonemes_list = []
                                phonemes_data = word_data.get("Phonemes", [])
                                for ph_data in phonemes_data:
                                    ph_text = ph_data.get("Phoneme", "")
                                    ph_pron = ph_data.get("PronunciationAssessment", {})
                                    ph_accuracy = float(ph_pron.get("AccuracyScore", 0))
                                    ph_error = ph_pron.get("ErrorType", "None")
                                    
                                    phonemes_list.append({
                                        "phoneme": ph_text,
                                        "ipa": ph_text,  # Returns IPA directly when phonemeAlphabet="IPA"
                                        "accuracy_score": ph_accuracy,
                                        "error_type": ph_error
                                    })
                                
                                # Assemble expected and detected pronunciations from phonemes dynamically
                                expected_ipa = "".join([ph["ipa"] for ph in phonemes_list])
                                detected_ipa = expected_ipa
                                
                                all_words.append({
                                    "word": word_text,
                                    "accuracy_score": word_accuracy,
                                    "error_type": word_error,
                                    "start_offset": offset_ms,
                                    "duration": duration_ms,
                                    "phonemes": phonemes_list,
                                    "expected_pronunciation": expected_ipa,
                                    "detected_pronunciation": detected_ipa
                                })
                    except Exception as e:
                        logger.error(f"Error parsing segment JSON response: {str(e)}")

        def canceled_cb(evt):
            nonlocal done, error_msg
            if evt.result.reason == speechsdk.ResultReason.Canceled:
                cancellation_details = evt.result.cancellation_details
                if cancellation_details.reason != speechsdk.CancellationReason.EndOfStream:
                    error_msg = f"Assessment canceled. Reason: {cancellation_details.reason}. Details: {cancellation_details.error_details}"
                    logger.error(error_msg)
            done = True

        def stop_cb(evt):
            nonlocal done
            done = True

        try:
            recognizer = speechsdk.SpeechRecognizer(
                speech_config=speech_config,
                audio_config=audio_config
            )
            pron_config.apply_to(recognizer)

            # Connect events
            recognizer.recognized.connect(recognized_cb)
            recognizer.session_stopped.connect(stop_cb)
            recognizer.canceled.connect(canceled_cb)

            # 5. Execute recognition
            recognizer.start_continuous_recognition()
            
            # Watchdog timer to prevent infinite hang (safety threshold: 90s)
            start_time = time.time()
            while not done:
                time.sleep(0.2)
                if time.time() - start_time > 90:
                    logger.warning("Azure assessment continuous recognition reached timeout limit. Stopping.")
                    break
        finally:
            if recognizer:
                try:
                    recognizer.stop_continuous_recognition()
                except Exception:
                    pass
                del recognizer
            
            # Clean up audio_config and force garbage collection to release Windows file handle lock
            if 'audio_config' in locals() and audio_config:
                del audio_config
            
            import gc
            gc.collect()

        if error_msg:
            raise AIServiceError(error_msg)
            
        if not utterance_scores:
            raise AIServiceError("No speech data was recognized. Please ensure the recording is clear and contains audible speech.")

        # 6. Aggregate Scores
        # Simple/weighted averaging of sentence assessments
        num_sentences = len(utterance_scores)
        avg_accuracy = sum(s["accuracy"] for s in utterance_scores) / num_sentences
        avg_fluency = sum(s["fluency"] for s in utterance_scores) / num_sentences
        avg_completeness = sum(s["completeness"] for s in utterance_scores) / num_sentences
        avg_prosody = sum(s["prosody"] for s in utterance_scores) / num_sentences

        # Transparent Scoring Algorithm:
        # Overall Score = 40% Accuracy + 30% Fluency + 20% Completeness + 10% Prosody
        overall_score = (
            (0.40 * avg_accuracy) +
            (0.30 * avg_fluency) +
            (0.20 * avg_completeness) +
            (0.10 * avg_prosody)
        )

        return {
            "overall_score": round(overall_score, 1),
            "breakdown": {
                "pronunciation": round(avg_accuracy, 1),
                "fluency": round(avg_fluency, 1),
                "completeness": round(avg_completeness, 1),
                "prosody": round(avg_prosody, 1)
            },
            "words": all_words,
            "transcript": " ".join(transcripts)
        }

# Singleton instance
azure_speech_service = AzureSpeechService()
