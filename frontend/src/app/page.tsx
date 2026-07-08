'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Volume2, Sparkles } from 'lucide-react';
import ConsentModal from '../components/consent-modal';
import AudioUploader from '../components/audio-uploader';
import PronunciationDashboard from '../components/pronunciation-dashboard';
import { PronunciationAnalysisResponse } from '../types/analysis';

export default function Home() {
  const [consentId, setConsentId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PronunciationAnalysisResponse | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mounted, setMounted] = useState(false);

  // Read existing session from localStorage upon client mounting
  useEffect(() => {
    setMounted(true);
    const cachedId = localStorage.getItem('livo_consent_id');
    if (cachedId) {
      setConsentId(cachedId);
    }
  }, []);

  const handleConsentGranted = (id: string) => {
    setConsentId(id);
  };

  const handleAnalysisComplete = (result: PronunciationAnalysisResponse, blob: Blob) => {
    setAudioBlob(blob);
    setAnalysisResult(result);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setAudioBlob(null);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-neutral-800 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050508] bg-gradient-to-b from-[#090915] via-[#050508] to-black text-white relative overflow-hidden flex flex-col justify-between selection:bg-violet-500/30 selection:text-violet-200">
      
      {/* Decorative Interactive Background glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-[30%] left-[45%] w-[30vw] h-[30vw] rounded-full bg-fuchsia-600/5 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 relative z-10 flex-grow flex flex-col">
        
        {/* Navbar */}
        <header className="flex justify-between items-center pb-5 border-b border-white/5 mb-8 sm:mb-12">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="bg-violet-600/10 group-hover:bg-violet-600/20 border border-violet-500/25 group-hover:border-violet-500/40 p-2 rounded-xl transition-all duration-300 shadow-md shadow-violet-500/5">
              <Volume2 className="w-5 h-5 text-violet-400 group-hover:text-violet-300 transition-colors" />
            </div>
            <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent group-hover:text-white transition-all duration-300">
              PRONOUNCEAI
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <a 
              href="#privacy" 
              className="text-xxs uppercase tracking-widest font-bold text-neutral-400 hover:text-white transition-colors flex items-center space-x-1.5 bg-neutral-900/50 border border-neutral-800 px-3 py-1.5 rounded-full"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              <span>DPDP Protected</span>
            </a>
          </div>
        </header>

        {/* Content Router */}
        <div className="flex-grow flex items-center justify-center py-4">
          {!consentId ? (
            /* Phase 1: Onboarding Consent Modal */
            <ConsentModal onConsentGranted={handleConsentGranted} />
          ) : !analysisResult ? (
            /* Phase 2: Upload or Record Audio */
            <div className="w-full max-w-2xl space-y-8 animate-fade-in">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center space-x-2 bg-violet-500/10 border border-violet-500/20 px-3.5 py-1.5 rounded-full text-xxs font-bold text-violet-300 uppercase tracking-widest animate-float">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Real-Time Pronunciation Coach</span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-none bg-gradient-to-b from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
                  Perfect Your Speech Pronunciation
                </h1>
                <p className="text-neutral-400 text-xs sm:text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                  Record or upload a 30-45 second English speech recording. Our AI analyzes syllables, pacing, and fluency with interactive metrics.
                </p>
              </div>
              
              <div className="glass-panel rounded-2xl p-0.5 shadow-xl">
                <AudioUploader 
                  consentId={consentId} 
                  onAnalysisComplete={handleAnalysisComplete} 
                />
              </div>
            </div>
          ) : (
            /* Phase 3: Results Dashboard */
            <div className="w-full animate-scale-in">
              <PronunciationDashboard 
                analysisResult={analysisResult} 
                consentId={consentId} 
                audioBlob={audioBlob}
                onReset={handleReset} 
              />
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-5 border-t border-white/5 text-center text-[10px] text-neutral-500 mt-12 relative z-10">
        <p className="tracking-wide">© 2026 PronounceAI. Compliant with India's DPDP Act, 2023. Audio processed in volatile memory only.</p>
      </footer>

    </main>
  );
}
