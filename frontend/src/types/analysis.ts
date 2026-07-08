export interface ConsentResponse {
  id: string;
  consent_given: boolean;
  terms_version: string;
  timestamp: string;
  ip_hash: string;
}

export interface PhonemeFeedback {
  phoneme: string;
  ipa?: string;
  accuracy_score: number;
  error_type: 'None' | 'Substitution' | 'Omission' | 'Insertion' | 'Mispronunciation';
}

export interface WordFeedback {
  word: string;
  accuracy_score: number;
  error_type: 'None' | 'Substitution' | 'Omission' | 'Insertion' | 'Mispronunciation';
  start_offset: number; // in milliseconds
  duration: number; // in milliseconds
  phonemes: PhonemeFeedback[];
  expected_pronunciation?: string;
  detected_pronunciation?: string;
  explanation?: string;
  suggestion?: string;
}

export interface ScoringBreakdown {
  pronunciation: number;
  fluency: number;
  completeness: number;
  prosody: number;
}

export interface PronunciationAnalysisResponse {
  overall_score: number;
  breakdown: ScoringBreakdown;
  words: WordFeedback[];
  general_suggestions: string[];
  transcript: string;
}
