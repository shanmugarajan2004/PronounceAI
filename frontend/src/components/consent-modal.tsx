'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, BookOpen, Trash2, ArrowRight } from 'lucide-react';
import { submitConsent } from '../lib/api';

interface ConsentModalProps {
  onConsentGranted: (consentId: string) => void;
}

export default function ConsentModal({ onConsentGranted }: ConsentModalProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToProcessing, setAgreedToProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!agreedToTerms || !agreedToProcessing) {
      setError('You must accept all terms and conditions to proceed.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await submitConsent(true, 'v1.0');
      // Store in localStorage for session persistence
      localStorage.setItem('livo_consent_id', response.id);
      onConsentGranted(response.id);
    } catch (err: any) {
      setError(err.message || 'An error occurred while logging consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/80 transition-all duration-300 animate-scale-in">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-violet-600/15 to-indigo-600/15">
          <div className="flex items-center space-x-3">
            <div className="bg-violet-500/15 p-2.5 rounded-xl border border-violet-500/30 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Data Privacy Consent</h2>
              <p className="text-xs text-neutral-400 mt-0.5 font-medium">DPDP Act (India) Compliance Dashboard</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto text-neutral-300 text-sm scrollbar-thin">
          
          <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 space-y-2">
            <div className="flex items-start space-x-2 text-amber-400">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-bold text-xs uppercase tracking-wider text-amber-400">Important Notice</span>
            </div>
            <p className="text-xxs sm:text-xs text-neutral-400 leading-relaxed font-medium">
              Under Section 6 of the Indian Digital Personal Data Protection (DPDP) Act, 2023, we require your explicit, unconditional consent before processing your voice recordings.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="bg-white/5 border border-white/10 p-2 rounded-lg text-violet-400 shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Purpose Limitation & Minimization</h4>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Your audio files are loaded into temporary server memory to evaluate pronunciation and are <strong className="text-violet-400">permanently deleted immediately after analysis</strong>. We do not store your voice files or use them to train machine learning models.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-white/5 border border-white/10 p-2 rounded-lg text-violet-400 shrink-0 mt-0.5">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Right to Erasure (Withdraw Consent)</h4>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  You can withdraw consent and erase your analysis history at any time by clicking the "Delete Session Data" button on the dashboard. This immediately purges all database logs associated with your session.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 space-y-3.5">
            <label className="flex items-start space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 accent-violet-500 rounded border-white/10 bg-neutral-800 text-violet-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-neutral-400 leading-relaxed group-hover:text-neutral-300 transition-colors font-medium">
                I agree to the Terms of Service and Privacy Policy. I confirm I am over 18 years of age.
              </span>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToProcessing}
                onChange={(e) => setAgreedToProcessing(e.target.checked)}
                className="mt-1 accent-violet-500 rounded border-white/10 bg-neutral-800 text-violet-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-neutral-400 leading-relaxed group-hover:text-neutral-300 transition-colors font-medium">
                I explicitly consent to the upload, temporary processing, and transcribing of my voice recording for speech pronunciation analysis.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/40 flex flex-col space-y-3">
          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg flex items-center font-medium animate-shake">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!agreedToTerms || !agreedToProcessing || loading}
            className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all duration-300 active:scale-98 ${
              agreedToTerms && agreedToProcessing && !loading
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/30'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Acknowledge & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
