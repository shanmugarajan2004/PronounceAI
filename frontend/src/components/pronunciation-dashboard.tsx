'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Trash2, ArrowLeft, HelpCircle, Check, AlertTriangle, XOctagon } from 'lucide-react';
import { PronunciationAnalysisResponse, WordFeedback } from '../types/analysis';
import { deleteConsent } from '../lib/api';

interface PronunciationDashboardProps {
  analysisResult: PronunciationAnalysisResponse;
  consentId: string;
  audioBlob: Blob | null;
  onReset: () => void;
}

export default function PronunciationDashboard({
  analysisResult,
  consentId,
  audioBlob,
  onReset
}: PronunciationDashboardProps) {
  const [selectedWord, setSelectedWord] = useState<WordFeedback | null>(null);
  const [selectedWordIdx, setSelectedWordIdx] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [playingWord, setPlayingWord] = useState<number | null>(null);

  const fullAudioRef = useRef<HTMLAudioElement | null>(null);
  const segmentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Generate local audio URL for playback
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [audioBlob]);

  // Handle playing the entire recorded speech
  const togglePlayFull = () => {
    if (!fullAudioRef.current && audioUrl) {
      fullAudioRef.current = new Audio(audioUrl);
      fullAudioRef.current.onended = () => setIsPlayingFull(false);
    }

    if (fullAudioRef.current) {
      if (isPlayingFull) {
        fullAudioRef.current.pause();
        setIsPlayingFull(false);
      } else {
        fullAudioRef.current.play();
        setIsPlayingFull(true);
      }
    }
  };

  // Playback clipping for a specific word based on start_offset and duration (ms)
  const playWordSegment = (word: WordFeedback, index: number) => {
    if (!audioUrl) return;

    // Stop current playing segment if any
    if (segmentAudioRef.current) {
      segmentAudioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    segmentAudioRef.current = audio;
    
    const startSec = word.start_offset / 1000;
    let timer: NodeJS.Timeout;

    const startPlayback = () => {
      audio.currentTime = startSec;
      setPlayingWord(index);
      audio.play()
        .then(() => {
          timer = setTimeout(() => {
            audio.pause();
            setPlayingWord(curr => curr === index ? null : curr);
          }, word.duration);
        })
        .catch((e) => {
          console.error('Segment playback failed:', e);
          setPlayingWord(null);
        });
    };

    // If metadata is already loaded (from cache), start immediately.
    // Otherwise, wait for it to avoid browser timeline reset bugs.
    if (audio.readyState >= 1) {
      startPlayback();
    } else {
      audio.addEventListener('loadedmetadata', startPlayback);
    }

    audio.onpause = () => {
      if (timer) clearTimeout(timer);
      setPlayingWord(curr => curr === index ? null : curr);
    };
  };

  // DPDP Right to Erasure Handler
  const handleDeleteSession = async () => {
    if (!confirm('Are you absolutely sure? This will delete all consent logs and analysis history associated with this session from our database. This action is irreversible.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteConsent(consentId);
      localStorage.removeItem('livo_consent_id');
      onReset();
    } catch (e: any) {
      alert(e.message || 'Failed to erase data. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to get color class based on score/error
  const getWordColorClass = (word: WordFeedback) => {
    const error = word.error_type;
    const score = word.accuracy_score;

    if (error === 'None' && score >= 80) {
      return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500/50';
    } else if (score >= 50 || error === 'Mispronunciation') {
      return 'text-amber-400 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-500/50';
    } else {
      return 'text-rose-400 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 hover:border-rose-500/50';
    }
  };

  // Compute SVG Radar Chart points dynamically
  const getRadarPoints = () => {
    const b = analysisResult.breakdown;
    const center = 100;
    const scale = 0.8; // map 0-100 score to 0-80px radius

    // 4 axes angles: 0 (top), 90 (right), 180 (bottom), 270 (left)
    // Pronunciation (Top), Fluency (Right), Completeness (Bottom), Prosody (Left)
    const pVal = b.pronunciation * scale;
    const fVal = b.fluency * scale;
    const cVal = b.completeness * scale;
    const prVal = b.prosody * scale;

    const p1 = `${center},${center - pVal}`;
    const p2 = `${center + fVal},${center}`;
    const p3 = `${center},${center + cVal}`;
    const p4 = `${center - prVal},${center}`;

    return `${p1} ${p2} ${p3} ${p4}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 text-neutral-300">
      
      {/* Top Banner Navigation */}
      <div className="lg:col-span-12 flex flex-col sm:flex-row justify-between items-center bg-white/[0.02] backdrop-blur-md p-4 rounded-xl border border-white/5 gap-3 shadow-md">
        <button
          onClick={onReset}
          className="flex items-center space-x-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors active:scale-98"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Analyze another file</span>
        </button>
        <span className="text-xxs sm:text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-3.5 py-1 rounded-full font-mono font-semibold">
          SESSION ID: {consentId.substring(0, 16)}
        </span>
      </div>

      {/* LEFT COLUMN: Main Score Cards & SVG Radar Graph (lg:col-span-4) 
          Using responsive subgrids: side-by-side on tablet (md), stacked on mobile/desktop */}
      <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
        
        {/* Overall Score Dial */}
        <div className="glass-panel border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Overall Score</h3>
          
          <div className="relative w-40 h-40 mt-6 flex items-center justify-center">
            {/* SVG Circle Gauge */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="68"
                className="stroke-white/5 fill-none"
                strokeWidth="10"
              />
              <circle
                cx="80"
                cy="80"
                r="68"
                className="stroke-violet-500 fill-none transition-all duration-1000 ease-out shadow-lg"
                strokeWidth="10"
                strokeDasharray={427.2} // 2 * pi * r (r=68)
                strokeDashoffset={427.2 - (427.2 * analysisResult.overall_score) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-4.5xl font-black text-white tracking-tighter text-neon-glow">{Math.round(analysisResult.overall_score)}</span>
              <span className="text-neutral-500 text-xs font-bold">/100</span>
            </div>
          </div>
          
          <button
            onClick={togglePlayFull}
            disabled={!audioUrl}
            className={`mt-6 w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-xs font-bold border transition-all active:scale-98 ${
              isPlayingFull 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white shadow-md'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isPlayingFull ? 'Stop Playback' : 'Listen to Full Recording'}</span>
          </button>
        </div>

        {/* SVG Radar Chart component */}
        <div className="glass-panel border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-6">Performance Mapping</h3>
          
          <div className="relative w-52 h-52 flex items-center justify-center bg-black/40 rounded-full border border-white/5 shadow-inner">
            <svg width="200" height="200" className="overflow-visible">
              {/* Radar Grid circles */}
              <circle cx="100" cy="100" r="80" className="fill-none stroke-white/5" strokeWidth="1" />
              <circle cx="100" cy="100" r="50" className="fill-none stroke-white/5" strokeWidth="1" />
              <circle cx="100" cy="100" r="25" className="fill-none stroke-white/5" strokeWidth="1" />
              
              {/* Radar Axes lines */}
              <line x1="100" y1="20" x2="100" y2="180" className="stroke-white/5" strokeWidth="1" />
              <line x1="20" y1="100" x2="180" y2="100" className="stroke-white/5" strokeWidth="1" />
              
              {/* Labels */}
              <text x="100" y="14" textAnchor="middle" className="fill-neutral-400 text-[9px] font-extrabold tracking-wider">ACCURACY</text>
              <text x="185" y="103" textAnchor="start" className="fill-neutral-400 text-[9px] font-extrabold tracking-wider">FLUENCY</text>
              <text x="100" y="195" textAnchor="middle" className="fill-neutral-400 text-[9px] font-extrabold tracking-wider">COMPLETE</text>
              <text x="15" y="103" textAnchor="end" className="fill-neutral-400 text-[9px] font-extrabold tracking-wider">PROSODY</text>

              {/* Polygons */}
              <polygon
                points={getRadarPoints()}
                className="fill-violet-500/20 stroke-violet-500"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Color Coded Words & Suggestions (lg:col-span-8) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Interactive Word Viewer */}
        <div className="glass-panel border-white/5 rounded-2xl p-6 space-y-5 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Click words for detailed evaluation</h3>
          
          <div className="flex flex-wrap gap-2 sm:gap-3 p-5 bg-black/40 rounded-xl border border-white/5 leading-relaxed">
            {analysisResult.words.map((wordData, idx) => {
              const isSelected = selectedWordIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedWord(wordData);
                    setSelectedWordIdx(idx);
                  }}
                  className={`px-3 py-1.5 border rounded-lg text-sm sm:text-base font-medium transition-all active:scale-95 cursor-pointer ${getWordColorClass(wordData)} ${
                    isSelected ? 'ring-2 ring-violet-500 scale-105 bg-white/5 border-violet-500' : ''
                  }`}
                >
                  {wordData.word}
                </button>
              );
            })}
          </div>

          {/* Individual Word Details Panel */}
          {selectedWord ? (
            <div className="bg-black/35 p-5 rounded-xl border border-white/5 relative animate-scale-in space-y-4 shadow-inner">
              
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-2xl font-black text-white tracking-tight">{selectedWord.word}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-neutral-500 font-medium">Accuracy Score:</span>
                    <span className={`text-xs font-mono font-bold ${
                      selectedWord.accuracy_score >= 80 ? 'text-emerald-400' :
                      selectedWord.accuracy_score >= 50 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {Math.round(selectedWord.accuracy_score)}/100
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => selectedWordIdx !== null && playWordSegment(selectedWord, selectedWordIdx)}
                    disabled={playingWord !== null}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-lg flex items-center justify-center transition-colors text-xs font-bold space-x-2 active:scale-95 shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{playingWord === selectedWordIdx ? 'Playing...' : 'Play Clip'}</span>
                  </button>
                </div>
              </div>

              {/* Expected vs Detected IPA */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-3.5 text-xs font-mono">
                <div className="bg-black/20 p-2.5 rounded-lg border border-white/[0.02]">
                  <span className="text-neutral-500 block uppercase tracking-wider text-[10px] font-bold">Expected IPA</span>
                  <span className="text-emerald-400 text-sm font-bold mt-1 block">
                    {selectedWord.expected_pronunciation ? `/${selectedWord.expected_pronunciation}/` : '/---/'}
                  </span>
                </div>
                <div className="bg-black/20 p-2.5 rounded-lg border border-white/[0.02]">
                  <span className="text-neutral-500 block uppercase tracking-wider text-[10px] font-bold">Detected Sound</span>
                  <span className={`text-sm font-bold mt-1 block ${selectedWord.error_type === 'None' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedWord.detected_pronunciation ? `/${selectedWord.detected_pronunciation}/` : '/---/'}
                  </span>
                </div>
              </div>

              {/* Explanations */}
              <div className="space-y-4 text-xs">
                {selectedWord.explanation ? (
                  <div>
                    <span className="font-bold text-neutral-400 block uppercase tracking-wider text-[10px] mb-1.5">Mistake Explanation</span>
                    <p className="text-neutral-300 leading-relaxed bg-[#0c0c0e]/80 p-3.5 rounded-lg border border-white/5 shadow-inner">
                      {selectedWord.explanation}
                    </p>
                  </div>
                ) : (
                  <div className="text-neutral-500 italic bg-white/[0.01] p-3.5 rounded-lg border border-dashed border-white/5 text-center font-medium">
                    Correctly articulated! No pronunciation errors detected.
                  </div>
                )}

                {selectedWord.suggestion && (
                  <div>
                    <span className="font-bold text-violet-400 block uppercase tracking-wider text-[10px] mb-1.5">Practice Tip</span>
                    <p className="text-neutral-300 leading-relaxed bg-violet-500/5 p-3.5 rounded-lg border border-violet-500/10 shadow-inner">
                      {selectedWord.suggestion}
                    </p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-10 text-neutral-500 text-xs border border-dashed border-white/10 rounded-xl bg-black/20">
              <HelpCircle className="w-6 h-6 mx-auto mb-2 text-neutral-600" />
              <span className="font-medium">Select any word from the transcript box above to inspect details and hear clips.</span>
            </div>
          )}

        </div>

        {/* Global Suggestions Box */}
        <div className="glass-panel border-white/5 rounded-2xl p-6 space-y-4 bg-gradient-to-r from-violet-950/5 to-indigo-950/5 shadow-lg">
          <div className="flex items-center space-x-2.5 text-violet-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold text-white tracking-tight text-base">Key Suggestions for Improvement</h3>
          </div>
          
          <ul className="space-y-3.5">
            {analysisResult.general_suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-3.5 text-sm">
                <span className="bg-violet-500/15 text-violet-400 font-mono font-bold text-xs w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/25">
                  {index + 1}
                </span>
                <span className="text-neutral-300 leading-relaxed font-medium">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Metric breakdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Accuracy', val: analysisResult.breakdown.pronunciation, icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Fluency', val: analysisResult.breakdown.fluency, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Completeness', val: analysisResult.breakdown.completeness, icon: Check, color: 'text-sky-400', bg: 'bg-sky-500/10' },
            { label: 'Prosody', val: analysisResult.breakdown.prosody, icon: XOctagon, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          ].map((item, idx) => (
            <div key={idx} className="glass-panel border-white/5 p-4 rounded-xl space-y-3 shadow-md">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-500 block truncate" title={item.label}>
                {item.label}
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-2.5xl font-mono font-extrabold text-white">{Math.round(item.val)}</span>
                <span className="text-[10px] text-neutral-500 font-bold">/100</span>
              </div>
              <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div style={{ width: `${item.val}%` }} className={`h-full ${item.color.replace('text', 'bg')}`} />
              </div>
            </div>
          ))}
        </div>

        {/* DPDP Section 12 Data Erasure Footer */}
        <div className="glass-panel border-red-500/10 bg-red-950/[0.01] p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="text-center sm:text-left space-y-1.5">
            <span className="text-xs font-bold text-white tracking-wide block uppercase text-rose-400">Privacy Controls (Right to Erasure)</span>
            <span className="text-xxs sm:text-xs text-neutral-500 leading-relaxed block max-w-sm font-medium">
              We abide by the Indian DPDP Act. Clicking the button will permanently erase all consent records and analysis logs associated with this session from our database.
            </span>
          </div>

          <button
            onClick={handleDeleteSession}
            disabled={isDeleting}
            className="flex items-center space-x-2 px-5 py-3 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all duration-300 shrink-0 active:scale-98 shadow-md"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-red-400 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Session Data</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
}
