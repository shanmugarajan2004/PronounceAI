'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Mic, Square, Trash2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAudioRecorder } from '../hooks/use-audio-recorder';
import { analyzeSpeech } from '../lib/api';
import { PronunciationAnalysisResponse } from '../types/analysis';

interface AudioUploaderProps {
  consentId: string;
  onAnalysisComplete: (result: PronunciationAnalysisResponse, blob: Blob) => void;
}

export default function AudioUploader({ consentId, onAnalysisComplete }: AudioUploaderProps) {
  const { status, duration, audioBlob, amplitude, startRecording, stopRecording, resetRecorder } = useAudioRecorder();
  
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side duration and property validation
  const validateAndProcessFile = (file: File) => {
    setError(null);
    setSuccessMsg(null);

    // 1. MIME check
    const allowedExtensions = ['wav', 'mp3', 'm4a', 'webm'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      setError(`Unsupported file format. Please upload: ${allowedExtensions.join(', ').toUpperCase()}`);
      return;
    }

    // 2. Size check (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum allowed size is 10MB.');
      return;
    }

    // 3. Client-side Duration check via Audio object
    const audioUrl = URL.createObjectURL(file);
    const audio = new Audio(audioUrl);
    
    audio.addEventListener('loadedmetadata', () => {
      const fileDuration = audio.duration;
      URL.revokeObjectURL(audioUrl);

      if (fileDuration < 30 || fileDuration > 45) {
        setError(`Audio must be between 30 and 45 seconds. Detected duration: ${Math.round(fileDuration)} seconds.`);
      } else {
        setSuccessMsg(`"${file.name}" loaded successfully (${Math.round(fileDuration)}s)`);
        // Upload immediately
        uploadFile(file);
      }
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(audioUrl);
      setError('Failed to read audio metadata. The file may be corrupted or invalid.');
    });
  };

  const uploadFile = async (blob: Blob) => {
    setError(null);
    setUploadProgress(0);
    
    try {
      const result = await analyzeSpeech(blob, consentId, (percent) => {
        setUploadProgress(percent);
        if (percent >= 100) {
          setAnalyzing(true);
        }
      });
      
      onAnalysisComplete(result, blob);
    } catch (err: any) {
      setError(err.message || 'An error occurred during speech analysis.');
      setUploadProgress(null);
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRecordStop = () => {
    stopRecording();
  };

  const submitRecording = () => {
    if (audioBlob) {
      if (duration < 30 || duration > 45) {
        setError(`Your recording is ${duration} seconds. It must be between 30 and 45 seconds to analyze.`);
        return;
      }
      uploadFile(audioBlob);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      
      {/* Upload/Recording Card */}
      <div 
        className={`glass-panel border-white/5 rounded-2xl p-8 sm:p-12 text-center transition-all duration-500 shadow-xl ${
          isDragActive 
            ? 'border-violet-500 bg-violet-500/5 shadow-2xl shadow-violet-500/10 scale-[1.01]' 
            : ''
        } ${uploadProgress !== null ? 'pointer-events-none opacity-90' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".wav,.mp3,.m4a,.webm" 
          className="hidden" 
        />

        {uploadProgress === null ? (
          <>
            {/* Split Interface: Record or Drop */}
            {status === 'idle' && !audioBlob && (
              <div className="space-y-8">
                
                {/* Drag Area */}
                <div 
                  onClick={triggerUpload}
                  className="group cursor-pointer border border-dashed border-white/10 hover:border-violet-500/50 bg-white/[0.01] hover:bg-white/[0.03] p-8 sm:p-12 rounded-xl transition-all duration-300"
                >
                  <div className="mx-auto bg-white/5 group-hover:bg-violet-500/10 p-4 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-violet-500/40 shadow-inner transition-all duration-300 mb-4">
                    <UploadCloud className="w-8 h-8 text-neutral-400 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <h3 className="font-bold text-white tracking-tight text-lg">Upload your speech audio</h3>
                  <p className="text-xs text-neutral-400 mt-2 max-w-xs mx-auto leading-relaxed">
                    Drag and drop your file here, or click to browse. WAV, MP3, M4A, WEBM accepted (30–45s, &lt;10MB).
                  </p>
                </div>

                <div className="flex items-center justify-center space-x-4">
                  <div className="h-[1px] w-14 bg-white/5" />
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-extrabold">Or</span>
                  <div className="h-[1px] w-14 bg-white/5" />
                </div>

                {/* Record Button */}
                <button
                  onClick={startRecording}
                  className="mx-auto flex items-center space-x-2.5 px-7 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-violet-600/20 active:scale-98 hover:scale-[1.02] transition-all duration-300"
                >
                  <Mic className="w-5 h-5" />
                  <span>Record speech directly</span>
                </button>

              </div>
            )}

            {/* Active Recording State */}
            {status === 'recording' && (
              <div className="space-y-8 py-4">
                <div className="flex items-center justify-center space-x-3 bg-rose-500/15 border border-rose-500/25 px-4 py-1.5 rounded-full w-fit mx-auto">
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  <span className="text-[10px] font-bold tracking-widest text-rose-400 uppercase">Live Recording</span>
                </div>
                
                {/* Volume wave simulator */}
                <div className="flex items-center justify-center space-x-2 h-20">
                  {[...Array(11)].map((_, i) => {
                    const speed = 0.4 + i * 0.12;
                    const val = amplitude > 0 ? (amplitude / 100) * 100 : 10;
                    const height = status === 'recording' ? Math.max(10, val * Math.sin(speed)) : 10;
                    return (
                      <div 
                        key={i} 
                        style={{ height: `${height}%` }}
                        className="w-2 bg-gradient-to-t from-violet-600 to-fuchsia-400 rounded-full transition-all duration-150 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                      />
                    );
                  })}
                </div>

                <div className="text-4xl font-mono font-black text-white tracking-widest">
                  {`00:${duration.toString().padStart(2, '0')}`}
                  <span className="text-base text-neutral-500 font-normal"> / 00:45</span>
                </div>

                {duration < 30 ? (
                  <p className="text-xs text-amber-400/90 font-medium">
                    Keep speaking! Make sure recording reaches at least 30 seconds (currently {duration}s).
                  </p>
                ) : (
                  <p className="text-xs text-emerald-400/90 font-semibold">
                    Perfect! You can stop and analyze now ({duration}s).
                  </p>
                )}

                <button
                  onClick={handleRecordStop}
                  className="mx-auto flex items-center space-x-2.5 px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold active:scale-98 transition-all duration-300 shadow-lg shadow-rose-600/20"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop Recording</span>
                </button>
              </div>
            )}

            {/* Stopped / Preview State */}
            {status === 'stopped' && audioBlob && (
              <div className="space-y-8 py-4">
                <div className="flex items-center justify-center space-x-2 text-violet-400 bg-violet-500/10 border border-violet-500/20 px-4 py-2 rounded-full w-fit mx-auto">
                  <CheckCircle2 className="w-5 h-5 text-violet-400" />
                  <span className="font-bold text-xs uppercase tracking-wider">Recording Captured</span>
                </div>

                <div className="bg-black/50 p-5 rounded-xl border border-white/5 max-w-sm mx-auto shadow-inner">
                  <audio 
                    src={URL.createObjectURL(audioBlob)} 
                    controls 
                    className="w-full h-10 accent-violet-500"
                  />
                  <div className="text-xs text-neutral-500 mt-3 font-mono font-medium">
                    Duration: {duration}s (Limit: 30-45s)
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={resetRecorder}
                    className="flex items-center space-x-2 px-5 py-3 bg-white/5 border border-white/15 hover:bg-white/10 text-neutral-300 rounded-xl text-sm font-bold transition-all duration-300"
                  >
                    <Trash2 className="w-4 h-4 text-neutral-400" />
                    <span>Discard</span>
                  </button>
                  
                  <button
                    onClick={submitRecording}
                    disabled={duration < 30}
                    className={`flex items-center space-x-2 px-7 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                      duration >= 30
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/30 hover:scale-[1.02] active:scale-98'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze Pronunciation</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Active Loading / Progress State */
          <div className="space-y-8 py-6">
            <div className="bg-violet-500/10 p-5 w-20 h-20 rounded-2xl flex items-center justify-center border border-violet-500/20 mx-auto animate-bounce shadow-lg shadow-violet-500/10">
              <UploadCloud className="w-10 h-10 text-violet-400" />
            </div>

            <div className="max-w-md mx-auto space-y-2.5">
              <h3 className="font-bold text-white tracking-tight text-xl">
                {analyzing ? 'Evaluating pronunciation...' : 'Uploading audio...'}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                {analyzing 
                  ? 'Azure Speech is matching acoustic levels, and Gemini is formatting corrections. This takes about 5 seconds...' 
                  : 'Sending speech recording bytes to the secure analysis server.'
                }
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-sm mx-auto space-y-3">
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div 
                  style={{ width: `${uploadProgress}%` }}
                  className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono font-bold text-neutral-500">
                <span>PROGRESS</span>
                <span className="text-violet-400">{uploadProgress}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Displays */}
      {error && (
        <div className="bg-rose-500/5 border border-rose-500/15 p-4 rounded-xl flex items-start space-x-3 text-rose-400 text-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-rose-400">Validation Error</span>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMsg && !error && (
        <div className="bg-emerald-500/5 border border-emerald-500/15 p-4 rounded-xl flex items-start space-x-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          <div>
            <span className="font-bold text-emerald-400">Audio Accepted</span>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed font-medium">{successMsg}</p>
          </div>
        </div>
      )}

    </div>
  );
}
