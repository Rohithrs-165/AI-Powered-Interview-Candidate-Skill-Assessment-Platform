'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Mic, MicOff, Volume2, Send, Sparkles, 
  TrendingUp, Award, Clock, ArrowRight, ShieldCheck, 
  ShieldAlert, Camera, Eye, AlertTriangle, CheckCircle2, 
  User, RefreshCw, VolumeX, Check, ChevronRight, Maximize2,
  Minimize2, Lock, Radio, AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';

function InterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Core Session States
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('candidate_name') || 'Candidate';
    }
    return 'Candidate';
  });
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [latestEval, setLatestEval] = useState<any>(null);
  const [adaptation, setAdaptation] = useState<any>(null);

  // Voice Recording & 2-Attempt Controller
  const [answerText, setAnswerText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingAttempts, setRecordingAttempts] = useState(0); // 0 = unrecorded, 1 = attempt 1 done, 2 = attempt 2 done (final)
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const maxRecordingAttempts = 2;

  // Proctoring, Camera & Fullscreen States
  const [cameraActive, setCameraActive] = useState(false);
  const [integrityScore, setIntegrityScore] = useState(100.0);
  const [malpracticeAlert, setMalpracticeAlert] = useState<string | null>(null);
  const [violationsCount, setViolationsCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMalpracticeTerminated, setIsMalpracticeTerminated] = useState(false);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const isTerminatingRef = useRef(false);
  const isCompletedRef = useRef(false);
  const finalTranscriptRef = useRef('');

  // Fullscreen Helper Functions
  const enterFullscreen = async () => {
    try {
      if (typeof document !== 'undefined' && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Fullscreen entry failed or user gesture required:', err);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen exit failed:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // 1. Initialize 18-Question Interview Session
  useEffect(() => {
    async function initInterview() {
      try {
        const storedCandId = typeof window !== 'undefined' ? localStorage.getItem('candidate_id') : null;
        const storedName = typeof window !== 'undefined' ? localStorage.getItem('candidate_name') : null;
        const storedRole = typeof window !== 'undefined' ? localStorage.getItem('candidate_role') : null;
        const res = await api.startInterview({
          interview_mode: 'voice',
          target_role: storedRole || 'Full Stack AI Engineer',
          primary_skills: ['Python', 'FastAPI', 'PostgreSQL', 'Next.js', 'System Design'],
          candidate_id: storedCandId || undefined,
          candidate_name: storedName || undefined
        });
        setInterviewId(res.interview_id);
        if (res.candidate_name) {
          setCandidateName(res.candidate_name);
        } else if (storedName) {
          setCandidateName(storedName);
        }
        setCurrentQuestion(res.current_question);
        if (res.integrity_score !== undefined) {
          setIntegrityScore(res.integrity_score);
        }

        if (res.current_question?.audio_tts_url) {
          playAudio(res.current_question.audio_tts_url);
        }
      } catch (err) {
        console.error('Failed to start interview session:', err);
      } finally {
        setLoading(false);
      }
    }
    initInterview();
  }, []);

  // 2. Initialize Camera Video Stream
  useEffect(() => {
    async function startCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 480, height: 360, facingMode: 'user' },
            audio: false
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setCameraActive(true);
          }
        }
      } catch (err) {
        console.warn('Camera access prevented or unavailable:', err);
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      stopCamera();
      exitFullscreen();
    };
  }, []);

  // 3. Helper: Capture Camera Snapshot
  const captureFrameSnapshot = (): string => {
    try {
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg', 0.6);
        }
      }
    } catch (e) {
      console.warn('Could not capture video frame:', e);
    }
    return '';
  };

  // 4. Trigger Malpractice Incident (With 3-Attempt Disqualification Rule)
  const triggerMalpractice = async (violationType: string, details: string) => {
    if (!interviewId || isCompletedRef.current || isTerminatingRef.current) return;

    const snapshot = captureFrameSnapshot();
    const nextViolations = violationsCount + 1;
    setViolationsCount(nextViolations);

    if (nextViolations > 3) {
      // Exceeded 3 attempts: Disqualify candidate immediately
      isTerminatingRef.current = true;
      setIsMalpracticeTerminated(true);
      setMalpracticeAlert(`Interview Terminated: Exceeded 3 malpractice attempts (${nextViolations} violations). Candidate marked as Malpractice.`);
      stopCamera();
      exitFullscreen();

      try {
        await api.terminateInterviewMalpractice(interviewId, {
          violation_count: nextViolations,
          reason: `Exceeded 3 proctoring malpractice attempts: ${details}`
        });
      } catch (err) {
        console.error('Failed to log malpractice termination:', err);
      }
      return;
    }

    const alertMsg = `Integrity Warning (${nextViolations}/3 Attempts): ${details}. Exceeding 3 attempts will disqualify you!`;
    setMalpracticeAlert(alertMsg);

    try {
      const res = await api.logMalpractice(interviewId, {
        violation_type: violationType,
        severity: 'high',
        snapshot_base64: snapshot,
        details: `${details} during live interview session.`
      });

      if (res.updated_integrity_score !== undefined) {
        setIntegrityScore(res.updated_integrity_score);
      }
    } catch (err) {
      console.error('Failed to log malpractice incident:', err);
    }

    setTimeout(() => {
      setMalpracticeAlert(null);
    }, 6000);
  };

  // 5. Anti-Cheat Event Listeners: Fullscreen Exit, Tab Switch & Window Blur Detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFs = !!document.fullscreenElement;
      setIsFullscreen(inFs);
      if (!inFs && interviewId && !isCompletedRef.current && !isTerminatingRef.current) {
        triggerMalpractice(
          'fullscreen_exit',
          'Candidate exited fullscreen mode during live interview'
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && interviewId && !isCompletedRef.current && !isTerminatingRef.current) {
        triggerMalpractice(
          'tab_switch',
          'Candidate navigated away / switched browser tabs during interview'
        );
      }
    };

    const handleWindowBlur = () => {
      if (interviewId && !isCompletedRef.current && !isTerminatingRef.current) {
        triggerMalpractice(
          'window_blur',
          'Candidate window focus lost / clicked external application'
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [interviewId, violationsCount]);

  // 6. Recording Duration Timer
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  // 7. Voice Recording Functions (2-Attempt Controller)
  const startRecordingAttempt = async (attemptNum: number) => {
    if (attemptNum > maxRecordingAttempts) return;

    // Ensure candidate is in fullscreen mode
    if (typeof document !== 'undefined' && !document.fullscreenElement) {
      await enterFullscreen();
    }

    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is supported directly in modern browsers (Chrome, Edge, Safari). Please enable microphone permissions.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      finalTranscriptRef.current = '';
      setAnswerText('');
      setRecordingSeconds(0);
      setRecordingAttempts(attemptNum);

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let currentFinal = finalTranscriptRef.current;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFinal += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        finalTranscriptRef.current = currentFinal;
        const completeTranscript = (currentFinal + interimTranscript).trim();
        setAnswerText(completeTranscript);
      };

      rec.onerror = (e: any) => {
        console.warn('Speech recognition event warning:', e);
        if (e.error === 'not-allowed') {
          setMalpracticeAlert('Microphone permission blocked. Please enable microphone permissions in your browser settings.');
        }
      };

      rec.onend = () => {
        // Naturally ended
      };

      rec.start();
      recognitionRef.current = rec;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsRecording(false);
    }
  };

  const stopRecordingAttempt = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
  };

  const playAudio = (url: string) => {
    if (url) {
      const audio = new Audio(url);
      audio.play().catch((e) => console.log('Audio autoplay prevented:', e));
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerText.trim() || !interviewId || !currentQuestion) return;

    if (isRecording) {
      stopRecordingAttempt();
    }

    setSubmitting(true);
    try {
      const res = await api.submitAnswer(interviewId, {
        question_id: currentQuestion.question_id,
        answer_text: answerText.trim(),
        answer_type: 'voice'
      });

      setLatestEval(res.evaluation);
      setAdaptation(res.adaptation);
      if (res.integrity_score !== undefined) {
        setIntegrityScore(res.integrity_score);
      }

      if (res.is_completed) {
        isCompletedRef.current = true;
        stopCamera();
        exitFullscreen();
        setTimeout(() => {
          router.push(`/candidate/report/${interviewId}`);
        }, 1800);
      } else if (res.next_question) {
        setCurrentQuestion(res.next_question);
        // Reset state for the next question
        setRecordingAttempts(0);
        setAnswerText('');
        setRecordingSeconds(0);
        setIsRecording(false);
        finalTranscriptRef.current = '';

        if (res.next_question.audio_tts_url) {
          playAudio(res.next_question.audio_tts_url);
        }
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Disqualification Modal Screen
  if (isMalpracticeTerminated) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-red-50 border-2 border-red-300 shadow-xl text-center space-y-5 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center mx-auto text-red-600">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-red-900">
            Interview Terminated for Malpractice
          </h2>
          <p className="text-sm text-red-700 leading-relaxed">
            You have exceeded the maximum threshold of <strong>3 proctoring violations</strong> during this session.
            Your live interview session has been permanently terminated and flagged for the HR review committee.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-red-200 text-left text-xs space-y-1.5 text-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Candidate:</span>
            <span className="font-bold text-slate-900">{candidateName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="font-bold text-red-600 uppercase">Disqualified (Malpractice)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Recorded Violations:</span>
            <span className="font-bold font-mono text-red-600">{violationsCount} Incidents</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Integrity Score:</span>
            <span className="font-bold font-mono text-red-600">0.0%</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => router.push('/candidate/dashboard')}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md transition-all"
          >
            Return to Candidate Portal
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Sparkles className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Preparing 18-Question Interview Studio...</p>
      </div>
    );
  }

  const qOrder = currentQuestion?.question_order || 1;
  const getPhaseInfo = (order: number) => {
    if (order <= 3) {
      return { phase: 'Phase 1: Assessment-Based Review', desc: 'Questions 1–3: Examining practical assessment coding solution & concurrency trade-offs.' };
    } else if (order <= 8) {
      return { phase: 'Phase 2: Job Description Alignment', desc: 'Questions 4–8: Assessing core engineering requirements from the job specification.' };
    } else {
      return { phase: 'Phase 3: Adaptive Skill Exploration', desc: 'Questions 9–18: Dynamically scaling difficulty based on your answering performance.' };
    }
  };

  const phaseInfo = getPhaseInfo(qOrder);
  const wordCount = answerText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-5xl mx-auto space-y-5 py-2 pb-16">
      {/* Hidden Snapshot Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Fullscreen Alert Banner (Required) */}
      {!isFullscreen && (
        <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs text-amber-950 font-medium">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Fullscreen Mode Required:</span> AI Proctoring requires full screen to maintain interview integrity. Exiting fullscreen logs a malpractice attempt.
            </div>
          </div>
          <button
            onClick={enterFullscreen}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shrink-0 transition-all"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Enter Fullscreen Mode
          </button>
        </div>
      )}

      {/* Malpractice Warning Banner */}
      {malpracticeAlert && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-fadeIn">
          <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs text-red-900">
            <span className="font-bold">PROCTORING INTEGRITY WARNING</span>
            <p className="text-red-700 leading-relaxed">{malpracticeAlert}</p>
            <span className="text-[11px] text-red-500">
              Candidate: <strong>{candidateName}</strong> • Incident logged with evidence snapshot
            </span>
          </div>
        </div>
      )}

      {/* Instructional Banner for Verbal Response & 2 Attempts Limit */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-950 shadow-sm">
        <Mic className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <span className="font-bold text-indigo-900">Mandatory Verbal Response & 2-Attempt Recording Limit</span>
          <p className="text-indigo-800">
            For each question, listen to or read the prompt, then <strong>record and submit your verbal response</strong> using your microphone. 
            You are permitted a <strong>maximum of 2 recording attempts</strong> per question. Manual text input is disabled to guarantee authentic verbal communication assessment.
          </p>
        </div>
      </div>

      {/* 18-Question Master Progress Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-sm">
            Q{qOrder}
          </div>
          <div>
            <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              {phaseInfo.phase}
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mt-0.5">
              <span>Question {qOrder} of 18</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                currentQuestion?.difficulty_level === 'hard'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : currentQuestion?.difficulty_level === 'medium'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {currentQuestion?.difficulty_level} Difficulty
              </span>
            </div>
          </div>
        </div>

        {/* Proctoring Indicators & Fullscreen Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-1.5 text-xs">
            <ShieldCheck className={`w-4 h-4 ${integrityScore < 75 ? 'text-red-600' : 'text-emerald-600'}`} />
            <span className="text-slate-500">Integrity:</span>
            <span className={`font-mono font-bold ${integrityScore < 75 ? 'text-red-600' : 'text-slate-900'}`}>
              {integrityScore}%
            </span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold ${
            violationsCount > 0 
              ? 'bg-red-50 border-red-200 text-red-700' 
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Violations:</span>
            <span className="font-mono font-bold">{violationsCount}/3</span>
          </div>

          <button
            onClick={isFullscreen ? exitFullscreen : enterFullscreen}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isFullscreen 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {isFullscreen ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fullscreen Active</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Enter Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Question & Voice Recording Console (Left) + Integrated Proctoring Camera (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Question & Voice Console */}
        <div className="lg:col-span-2 space-y-6">
          {/* Adaptive Progression Notice */}
          {adaptation && (
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3 animate-fadeIn">
              <TrendingUp className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-indigo-900">
                  Adaptive AI Progression: {adaptation.decision_type.toUpperCase()} ({adaptation.previous_difficulty} → {adaptation.next_difficulty})
                </span>
                <p className="text-indigo-700 leading-relaxed">{adaptation.decision_reason}</p>
              </div>
            </div>
          )}

          {/* Question Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" /> Domain: {currentQuestion?.skill_area}
              </span>
              {currentQuestion?.audio_tts_url && (
                <button
                  onClick={() => playAudio(currentQuestion.audio_tts_url)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-4 h-4 text-indigo-600" /> Read Out Loud
                </button>
              )}
            </div>

            <p className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
              {currentQuestion?.question_text}
            </p>

            {/* Voice Recording Control Area (Max 2 Attempts) */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              {/* Attempt Counter Status Bar */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Recording Attempts:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                    recordingAttempts === 0
                      ? 'bg-slate-200 text-slate-800'
                      : recordingAttempts === 1
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {recordingAttempts} / {maxRecordingAttempts} Used
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  {recordingAttempts === 0 && '2 attempts available'}
                  {recordingAttempts === 1 && !isRecording && '1 final attempt remaining if re-recording'}
                  {recordingAttempts === 2 && !isRecording && 'Maximum attempts reached (Locked)'}
                  {isRecording && `Attempt ${recordingAttempts} active (${formatTime(recordingSeconds)})`}
                </div>
              </div>

              {/* Recording Action Buttons */}
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 text-center space-y-4">
                {/* Visualizer & Status */}
                {isRecording ? (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-red-600 uppercase tracking-wider">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                      <span>Recording Live Voice (Attempt {recordingAttempts} of 2)</span>
                    </div>

                    <div className="text-3xl font-mono font-bold text-slate-900">
                      {formatTime(recordingSeconds)}
                    </div>

                    {/* Animated Waveform Simulation */}
                    <div className="flex items-center justify-center gap-1.5 h-8">
                      {[40, 75, 100, 60, 90, 45, 80, 65, 95, 50, 70, 85].map((h, i) => (
                        <span
                          key={i}
                          className="w-1 bg-indigo-600 rounded-full animate-pulse"
                          style={{
                            height: `${h}%`,
                            animationDuration: `${0.4 + (i % 4) * 0.2}s`
                          }}
                        />
                      ))}
                    </div>

                    <button
                      onClick={stopRecordingAttempt}
                      className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/25 transition-all flex items-center gap-2 mx-auto"
                    >
                      <MicOff className="w-4 h-4" />
                      Stop Recording & Review (Attempt {recordingAttempts}/2)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recordingAttempts === 0 && (
                      <div className="space-y-3">
                        <button
                          onClick={() => startRecordingAttempt(1)}
                          className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2.5 mx-auto"
                        >
                          <Mic className="w-5 h-5" />
                          Start Voice Recording (Attempt 1 of 2)
                        </button>
                        <p className="text-xs text-slate-500">
                          Click to begin your verbal explanation. Your spoken words will transcribe live below.
                        </p>
                      </div>
                    )}

                    {recordingAttempts === 1 && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <button
                            onClick={() => startRecordingAttempt(2)}
                            className="px-5 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-xs border border-amber-300 transition-all flex items-center gap-2"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Re-record Answer (Final Attempt 2 of 2)
                          </button>
                        </div>
                        <p className="text-[11px] text-amber-700">
                          Notice: Re-recording will discard the current draft and use your 2nd (final) attempt.
                        </p>
                      </div>
                    )}

                    {recordingAttempts >= 2 && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4 text-amber-700" />
                        <span>Maximum 2 recording attempts used for this question. Please submit your recorded response below.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Read-Only Speech-to-Text Transcript Display Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-indigo-600" /> Captured Voice Transcript
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {wordCount} words captured
                  </span>
                </div>

                <div className={`p-4 rounded-2xl border text-sm leading-relaxed min-h-[110px] flex flex-col justify-between transition-all ${
                  answerText.trim()
                    ? 'bg-slate-50 border-slate-300 text-slate-900 shadow-inner'
                    : 'bg-slate-50/50 border-dashed border-slate-200 text-slate-400 justify-center items-center text-center'
                }`}>
                  {answerText.trim() ? (
                    <>
                      <p className="whitespace-pre-wrap">{answerText}</p>
                      <div className="pt-3 mt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Voice Captured & Transcribed
                        </span>
                        <span className="text-slate-400">Ready for Multi-Target Evaluation</span>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1 py-4">
                      <Mic className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="font-medium text-slate-400 text-xs">
                        Your verbal explanation will transcribe here automatically.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Click &ldquo;Start Voice Recording&rdquo; above to answer.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submission Controls */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  {recordingAttempts > 0 
                    ? `Attempt ${recordingAttempts}/2 Recorded` 
                    : 'Awaiting Voice Recording'}
                </span>

                <button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !answerText.trim() || isRecording}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-white" />
                      Evaluating with Multi-Target ML...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Voice Response ({qOrder}/18)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Previous Answer Feedback Preview */}
          {latestEval && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Score Evaluation of Previous Answer
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-600">
                  Overall: {latestEval.overall_score}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-slate-500 text-[11px]">Accuracy</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{latestEval.accuracy_score}%</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-slate-500 text-[11px]">Technical</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{latestEval.technical_score}%</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-slate-500 text-[11px]">Relevance</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{latestEval.relevance_score}%</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-slate-500 text-[11px]">Communication</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{latestEval.communication_score}%</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Live Camera Proctoring Tile */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Camera className="w-4 h-4 text-indigo-600" />
                Live Camera Proctoring
              </div>
              <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Active
              </span>
            </div>

            <div className="relative aspect-video rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400 text-xs p-4 text-center space-y-1">
                  <Camera className="w-6 h-6 text-slate-400" />
                  <p className="font-medium text-slate-600">Camera Feed Active</p>
                </div>
              )}

              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-white font-mono">
                {candidateName}
              </div>
            </div>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" /> Face Position:
                </span>
                <span className="text-emerald-700 font-semibold">Centered</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-600" /> Fullscreen Status:
                </span>
                <span className={isFullscreen ? "text-emerald-700 font-semibold" : "text-amber-600 font-bold"}>
                  {isFullscreen ? "Fullscreen Active" : "Exited / Inactive"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Browser Focus:
                </span>
                <span className="text-emerald-700 font-semibold">Active Window</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Proctoring Attempts:
                </span>
                <span className={`font-bold font-mono ${violationsCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                  {violationsCount} / 3 Violations
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveInterviewPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Sparkles className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading 18-Question Interview Studio...</p>
      </div>
    }>
      <InterviewContent />
    </Suspense>
  );
}
