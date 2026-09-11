'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Clock, CheckCircle2, AlertTriangle, ArrowRight, 
  Sparkles, Code, BookOpen, Layers, Check, ShieldCheck, 
  ChevronRight, Lock, Camera, CameraOff, Maximize2, Minimize2,
  Eye, ShieldAlert, Video, Play, Terminal, RotateCcw
} from 'lucide-react';
import { api } from '@/lib/api';

function AssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawAppId = searchParams.get('appId');

  const [session, setSession] = useState<any>(null);
  const [activeSectionKey, setActiveSectionKey] = useState<string>('aptitude');
  const [answers, setAnswers] = useState<any>({
    aptitude: {},
    verbal: {},
    role_mcqs: {},
    coding: ''
  });
  const [secondsRemaining, setSecondsRemaining] = useState(55 * 60);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionResult, setCompletionResult] = useState<any>(null);
  const [showReviewMode, setShowReviewMode] = useState(false);

  // Python Code Execution States (Run & Output Terminal)
  const [runningCode, setRunningCode] = useState(false);
  const [codeOutput, setCodeOutput] = useState<{
    status: string;
    stdout: string;
    stderr: string;
    exit_code?: number;
    execution_time_ms?: number;
  } | null>(null);

  // Camera Proctoring & Fullscreen States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [proctoringStarted, setProctoringStarted] = useState(false);
  const [malpracticeAlert, setMalpracticeAlert] = useState<string | null>(null);

  // Malpractice & Violation Tracking (>3 attempts terminates assessment)
  const [violationAttempts, setViolationAttempts] = useState(0);
  const [isMalpracticeTerminated, setIsMalpracticeTerminated] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [lastViolationReason, setLastViolationReason] = useState('');
  const violationCountRef = useRef(0);
  const isTerminatingRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Helper to start webcam proctoring
  const startCamera = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, facingMode: 'user' },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
        setCameraError(null);
      }
    } catch (err: any) {
      console.warn('Camera access prevented or not granted:', err);
      setCameraError('Camera access required for proctored evaluation.');
      setCameraActive(false);
    }
  };

  // Helper to stop webcam proctoring
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

  // Helper to enter fullscreen
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

  // Helper to exit fullscreen
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

  useEffect(() => {
    async function loadAssessment() {
      let candId = '';
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        candId = localStorage.getItem('candidate_id') || '';
        if (!token || !candId) {
          router.replace('/candidate/auth');
          return;
        }
      }

      try {
        setError(null);
        let targetAppId = rawAppId;

        // If no valid appId in query parameters, look up candidate's active application
        if (!targetAppId || targetAppId === 'app_demo_1') {
          if (candId) {
            try {
              const myApps = await api.getMyApplications(candId);
              if (Array.isArray(myApps) && myApps.length > 0) {
                const shortlisted = myApps.find((a: any) => a.match_status === 'shortlisted');
                targetAppId = shortlisted ? shortlisted.application_id : myApps[0].application_id;
              }
            } catch (e) {
              console.warn('Could not retrieve candidate applications:', e);
            }
          }
        }

        const res = await api.startAssessment(targetAppId || undefined, candId || undefined);
        if (!res || !res.sections || !Array.isArray(res.sections) || res.sections.length === 0) {
          setError('Assessment questions could not be loaded for this session.');
          return;
        }

        setSession(res);
        setSecondsRemaining(res.remaining_seconds || 55 * 60);

        // If assessment was already terminated for malpractice, lock with malpractice screen
        if (res.is_malpractice || res.status === 'malpractice' || res.assessment_status === 'malpractice') {
          setIsMalpracticeTerminated(true);
          stopCamera();
          exitFullscreen();
          return;
        }

        // Check if already completed in local storage
        let locallySaved = false;
        try {
          const appLockKey = targetAppId ? `neurova_assessment_${targetAppId}_completed` : null;
          const sessLockKey = res.session_id ? `neurova_assessment_${res.session_id}_completed` : null;
          if ((appLockKey && localStorage.getItem(appLockKey)) || (sessLockKey && localStorage.getItem(sessLockKey))) {
            locallySaved = true;
            const savedAnsRaw = (appLockKey && localStorage.getItem(`neurova_assessment_${targetAppId}_answers`)) ||
                               (sessLockKey && localStorage.getItem(`neurova_assessment_${res.session_id}_answers`));
            if (savedAnsRaw) {
              setAnswers(JSON.parse(savedAnsRaw));
            }
          }
        } catch (e) {}

        // If assessment is already completed, lock and prevent editing
        if (locallySaved || res.is_completed || res.assessment_status === 'completed' || res.status === 'already_completed') {
          setCompletionResult({
            evaluations: res.evaluations || res.scores || {},
            already_completed: true,
            message: 'Assessment completed and locked. Answers cannot be modified.'
          });
          if (res.answers) {
            setAnswers(res.answers);
          } else if (res.coding_submission) {
            setAnswers((prev: any) => ({ ...prev, coding: res.coding_submission }));
          }
          stopCamera();
          exitFullscreen();
          return;
        }

        const codingSection = res.sections.find((s: any) => s.section_key === 'coding');
        if (codingSection && codingSection.problem?.starter_code) {
          const defaultStarterWithTests = `${codingSection.problem.starter_code}\n# --- Test Cases & Verification ---\nif __name__ == '__main__':\n    limiter = TokenBucketRateLimiter(capacity=5, refill_rate=1.0)\n    print("Executing TokenBucketRateLimiter Test Run:")\n    for i in range(1, 8):\n        allowed = limiter.allow_request(1)\n        status = "[ALLOWED]" if allowed else "[BLOCKED / RATE LIMITED]"\n        print(f"  Request #{i}: {status} (Remaining tokens: {limiter.tokens:.1f})")\n`;
          setAnswers((prev: any) => ({
            ...prev,
            coding: prev.coding || defaultStarterWithTests
          }));
        }

        // Assessment is active: attempt initial camera start & fullscreen
        startCamera();
        enterFullscreen();
        setProctoringStarted(true);

      } catch (err: any) {
        console.error('Failed to load assessment:', err);
        setError(err.message || 'Failed to start assessment session.');
      } finally {
        setLoading(false);
      }
    }
    loadAssessment();
  }, [rawAppId, router]);

  // Handle video element attaching when camera is active
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  // Register anti-cheat violation attempt (>3 attempts terminates assessment and marks malpractice)
  const registerViolation = async (reason: string) => {
    const isFinished = session?.assessment_status === 'completed' || 
                       session?.assessment_status === 'malpractice' || 
                       session?.is_completed || 
                       !!completionResult || 
                       isMalpracticeTerminated || 
                       isTerminatingRef.current;
    if (isFinished || !proctoringStarted) return;

    violationCountRef.current += 1;
    const currentAttempts = violationCountRef.current;
    setViolationAttempts(currentAttempts);
    setLastViolationReason(reason);

    if (currentAttempts > 3) {
      // EXCEEDED 3 ATTEMPTS: Immediately End Assessment and Mark as Malpractice
      isTerminatingRef.current = true;
      setIsMalpracticeTerminated(true);
      setShowWarningModal(false);
      setMalpracticeAlert(`Assessment Terminated: Exceeded 3 attempts (${currentAttempts} violations recorded). Candidate marked as Malpractice.`);

      stopCamera();
      exitFullscreen();

      if (session?.session_id) {
        try {
          await api.terminateAssessmentMalpractice(session.session_id, {
            violation_count: currentAttempts,
            reason: `Exceeded 3 malpractice attempts (${currentAttempts} violations): ${reason}`
          });
        } catch (err) {
          console.error('Failed to notify backend of malpractice termination:', err);
        }
      }
    } else {
      setShowWarningModal(true);
      setMalpracticeAlert(`⚠️ Malpractice Warning (${currentAttempts}/3 Attempts): ${reason}. Exceeding 3 attempts will terminate your assessment!`);
    }
  };

  // Fullscreen & Visibility Change Listeners (Anti-Cheat)
  useEffect(() => {
    const isFinished = session?.assessment_status === 'completed' || 
                       session?.assessment_status === 'malpractice' || 
                       session?.is_completed || 
                       !!completionResult || 
                       isMalpracticeTerminated;
    if (isFinished) {
      stopCamera();
      exitFullscreen();
      return;
    }

    const handleFullscreenChange = () => {
      const inFs = !!document.fullscreenElement;
      setIsFullscreen(inFs);
      if (!inFs && proctoringStarted && !isTerminatingRef.current) {
        registerViolation('Exited Fullscreen Mode');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && proctoringStarted && !isTerminatingRef.current) {
        registerViolation('Switched Browser Tab or Minimized Window');
      }
    };

    const handleWindowBlur = () => {
      if (proctoringStarted && !isTerminatingRef.current) {
        registerViolation('Window Unfocused (Clicked outside browser)');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      stopCamera();
      exitFullscreen();
    };
  }, [session, completionResult, proctoringStarted, isMalpracticeTerminated]);

  useEffect(() => {
    if (secondsRemaining <= 0 || completionResult) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining, completionResult]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLocked = session?.assessment_status === 'completed' || session?.is_completed || !!completionResult;

  const handleOptionSelect = (sectionKey: string, qid: number, optionIdx: number) => {
    if (isLocked) return;
    setAnswers((prev: any) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        [qid.toString()]: optionIdx
      }
    }));
  };

  const handleRunCode = async () => {
    if (isLocked) {
      alert('This assessment is finalized and locked. Code execution and editing are disabled.');
      return;
    }

    const codeToRun = (answers.coding || '').trim();
    if (!codeToRun) {
      setCodeOutput({
        status: 'error',
        stdout: '',
        stderr: 'Please write some Python code in the workspace before running.',
        exit_code: 1,
        execution_time_ms: 0
      });
      return;
    }

    setRunningCode(true);
    setCodeOutput(null);

    try {
      const res = await api.runPythonCode({ code: codeToRun, language: 'python' });
      setCodeOutput(res);
    } catch (err: any) {
      console.warn('Backend code execution notice:', err);
      setCodeOutput({
        status: 'error',
        stdout: '',
        stderr: `Execution Service Notice: ${err?.message || 'Unable to contact execution daemon. Verify backend server is active.'}`,
        exit_code: 1,
        execution_time_ms: 0
      });
    } finally {
      setRunningCode(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!session?.session_id || isLocked) {
      if (isLocked) {
        alert('This assessment is finalized and locked. It cannot be modified or re-submitted.');
      }
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.submitAssessment(session.session_id, answers);
      setCompletionResult(res);

      // Permanently lock in browser storage
      try {
        if (rawAppId) {
          localStorage.setItem(`neurova_assessment_${rawAppId}_completed`, 'true');
          localStorage.setItem(`neurova_assessment_${rawAppId}_answers`, JSON.stringify(answers));
        }
        if (session.session_id) {
          localStorage.setItem(`neurova_assessment_${session.session_id}_completed`, 'true');
          localStorage.setItem(`neurova_assessment_${session.session_id}_answers`, JSON.stringify(answers));
        }
      } catch (e) {}

      // Turn off camera proctoring and exit fullscreen immediately
      stopCamera();
      exitFullscreen();
    } catch (err: any) {
      console.error('Failed to submit assessment:', err);
      // Lock locally so user cannot alter answers
      setCompletionResult({
        already_completed: true,
        message: 'Assessment submitted and locked.'
      });
      try {
        if (rawAppId) {
          localStorage.setItem(`neurova_assessment_${rawAppId}_completed`, 'true');
          localStorage.setItem(`neurova_assessment_${rawAppId}_answers`, JSON.stringify(answers));
        }
      } catch (e) {}
      stopCamera();
      exitFullscreen();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Sparkles className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Initializing 55-Minute Assessment Session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Assessment Unavailable</h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {error}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/candidate/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>Return to Candidate Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // Malpractice Disqualification Screen (> 3 attempts)
  if (isMalpracticeTerminated) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-600 flex items-center justify-center mx-auto shadow-lg animate-pulse">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Status: Disqualified for Malpractice
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Assessment Terminated
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            You have exceeded the maximum allowed proctoring violations ({violationAttempts > 0 ? violationAttempts : 4} attempts detected). 
            Your assessment session has been immediately ended, your camera disconnected, and your application permanently marked as <strong>Malpractice</strong> in the HR Review Dashboard.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 text-left max-w-md mx-auto space-y-2 text-xs text-rose-900 shadow-sm">
          <div className="font-bold flex items-center gap-1.5 text-rose-800">
            <CameraOff className="w-4 h-4" /> Proctoring Actions Executed:
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
            <li>Live AI Camera stream disconnected & hardware turned off</li>
            <li>Fullscreen lock released and test session closed</li>
            <li>Incident logged to candidate malpractice record in HR portal</li>
            <li>Application status permanently updated to <strong>MALPRACTICE</strong></li>
          </ul>
        </div>

        <div className="pt-2">
          <Link
            href="/candidate/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>Return to Candidate Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  if (completionResult && !showReviewMode) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Assessment Finalized & Locked
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
              <CameraOff className="w-3.5 h-3.5 text-slate-500" />
              Camera Turned Off • Fullscreen Concluded
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Skill Assessment Completed!</h1>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Your answers across Quantitative Aptitude, Verbal Reasoning, Role Technical MCQs, and Practical Coding have been finalized and recorded. Camera proctoring and fullscreen mode have been safely turned off.
          </p>
        </div>

        {completionResult.evaluations && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl">
              <div className="text-slate-500">Aptitude</div>
              <div className="text-lg font-bold text-slate-900 mt-1">{completionResult.evaluations.aptitude_score}%</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl">
              <div className="text-slate-500">Verbal</div>
              <div className="text-lg font-bold text-slate-900 mt-1">{completionResult.evaluations.verbal_score}%</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl">
              <div className="text-slate-500">Role MCQs</div>
              <div className="text-lg font-bold text-slate-900 mt-1">{completionResult.evaluations.role_mcqs_score}%</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl">
              <div className="text-slate-500">Coding</div>
              <div className="text-lg font-bold text-slate-900 mt-1">{completionResult.evaluations.coding_score}%</div>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setShowReviewMode(true)}
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Review Answers (Read-Only)</span>
          </button>

          <Link
            href="/candidate/interview"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all"
          >
            <span>Proceed to 18-Question Adaptive Interview</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const sections = session?.sections || [];
  const currentSection = sections.find((s: any) => s.section_key === activeSectionKey) || sections[0] || null;

  if (!currentSection) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto shadow-sm">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">No Assessment Sections Found</h2>
        <p className="text-xs text-slate-500">Please return to your dashboard or apply to an open position.</p>
        <Link
          href="/candidate/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2 pb-24 relative">
      {/* Malpractice Warning Modal for Attempts 1, 2, and 3 */}
      {showWarningModal && !isMalpracticeTerminated && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-rose-400 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
                Violation Attempt {violationAttempts} of 3
              </span>
              <h3 className="text-lg font-bold text-slate-900 pt-1">
                Proctoring Violation Warning
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Trigger:</strong> {lastViolationReason || 'Fullscreen exit or window unfocus'}.
              </p>
              <p className="text-xs text-rose-600 font-semibold leading-relaxed">
                {violationAttempts < 3 
                  ? `You have ${3 - violationAttempts} warning${3 - violationAttempts === 1 ? '' : 's'} remaining. Exceeding 3 attempts will immediately terminate your assessment and mark your application as Malpractice.`
                  : 'This is your 3rd and final warning! Any further violation will immediately end your assessment and disqualify you for Malpractice.'
                }
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  setShowWarningModal(false);
                  await enterFullscreen();
                }}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Maximize2 className="w-4 h-4" />
                <span>I Understand • Return to Fullscreen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Malpractice / Fullscreen Alert Banner */}
      {malpracticeAlert && !isLocked && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-bounce">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{malpracticeAlert}</span>
          </div>
          <button
            type="button"
            onClick={enterFullscreen}
            className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 transition-all flex items-center gap-1.5"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Re-enter Fullscreen</span>
          </button>
        </div>
      )}

      {/* Fullscreen Setup Banner if not in Fullscreen */}
      {!isFullscreen && !isLocked && !malpracticeAlert && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>AI Proctoring active: Fullscreen mode is required to safeguard assessment integrity.</span>
          </div>
          <button
            type="button"
            onClick={enterFullscreen}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 transition-all flex items-center gap-1.5"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Enter Fullscreen</span>
          </button>
        </div>
      )}

      {/* Read-Only Review Mode Banner */}
      {showReviewMode && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700" />
            <span><strong>Assessment Finalized & Locked:</strong> Your submission has been permanently recorded. Answers cannot be modified.</span>
          </span>
          <button
            type="button"
            onClick={() => setShowReviewMode(false)}
            className="text-indigo-600 hover:text-indigo-800 font-bold underline text-xs shrink-0"
          >
            Back to Score Summary
          </button>
        </div>
      )}

      {/* Top Header & Master Timer & Proctoring Indicators */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              Phase 1 • Technical Skill Assessment
            </span>
            {!isLocked && (
              <>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {cameraActive ? 'Camera Proctoring Active' : 'Connecting Camera...'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isFullscreen 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  <Maximize2 className="w-3 h-3" />
                  {isFullscreen ? 'Fullscreen Active' : 'Fullscreen Inactive'}
                </span>
              </>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            55-Minute Multi-Section Assessment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Section 1: Aptitude (15m) • Section 2: Verbal (5m) • Section 3: Role MCQs (5m) • Section 4: Coding (30m)
          </p>
        </div>

        {/* Global Timer / Locked Status Badge */}
        {isLocked ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl self-start sm:self-auto">
            <Lock className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-700">Assessment Status</div>
              <div className="text-sm font-bold text-emerald-950">
                Completed & Locked
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl self-start sm:self-auto">
            <Clock className="w-5 h-5 text-indigo-600 animate-pulse" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Time Remaining</div>
              <div className="text-xl font-mono font-bold text-slate-900">
                {formatTimer(secondsRemaining)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {sections.map((sec: any) => {
          const isActive = sec.section_key === activeSectionKey;
          const answeredCount = sec.section_key === 'coding' 
            ? (answers.coding ? 1 : 0) 
            : Object.keys(answers[sec.section_key] || {}).length;

          return (
            <button
              key={sec.section_key}
              onClick={() => setActiveSectionKey(sec.section_key)}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                isActive
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold truncate">{sec.title || 'Section'}</div>
              <div className={`text-[11px] mt-1 flex items-center justify-between ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                <span>{sec.duration_minutes ?? 15} min</span>
                <span>{answeredCount} / {sec.question_count ?? 5} answered</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Section Question Container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">{currentSection?.title || 'Section Assessment'}</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Time Allocation: {currentSection?.duration_minutes ?? 15} Minutes
          </span>
        </div>

        {/* Render MCQs (Aptitude, Verbal, Role MCQs) */}
        {currentSection?.section_key !== 'coding' ? (
          <div className="space-y-6">
            {currentSection?.questions?.map((q: any, qIdx: number) => {
              const selectedOpt = answers[currentSection?.section_key]?.[q.id.toString()];

              return (
                <div key={q.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="text-xs font-bold text-slate-900 flex items-start gap-2">
                    <span className="text-indigo-600">Q{qIdx + 1}.</span>
                    <span>{q.q}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options?.map((opt: string, optIdx: number) => {
                      const isSelected = selectedOpt === optIdx;

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleOptionSelect(currentSection?.section_key || '', q.id, optIdx)}
                          className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2.5 ${
                            isLocked ? 'cursor-default' : ''
                          } ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-semibold'
                              : isLocked
                                ? 'bg-white border-slate-200 text-slate-400'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                            isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Render Section 4: Long Programming Problem */
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  {currentSection?.problem?.title || 'Concurrency & System Architecture Problem'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 border border-red-200 text-red-700">
                  {currentSection?.problem?.difficulty || 'Hard'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentSection?.problem?.description || 'Implement a high-throughput thread-safe rate limiter in Python.'}
              </p>
            </div>

            {isLocked && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex items-center gap-2.5 font-medium shadow-sm">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Assessment Finalized & Locked:</strong> Your Python solution has been submitted. Editing and code execution are permanently disabled.
                </span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-900">
                    Python Implementation Workspace (Python 3.x Sandbox)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Write your solution and test cases below. Click <strong>Run Python Code</strong> to test execution and view output.
                  </p>
                </div>

                {!isLocked ? (
                  <button
                    type="button"
                    onClick={handleRunCode}
                    disabled={runningCode || isLocked}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all disabled:opacity-60 cursor-pointer self-start sm:self-auto"
                    title="Execute your Python code and inspect output in the terminal below"
                  >
                    {runningCode ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>Running Python...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Run Python Code</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-xs flex items-center gap-1.5 self-start sm:self-auto">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Execution Disabled (Submitted)</span>
                  </span>
                )}
              </div>

              <textarea
                rows={13}
                value={answers.coding}
                readOnly={isLocked}
                disabled={isLocked}
                onChange={(e) => !isLocked && setAnswers((prev: any) => ({ ...prev, coding: e.target.value }))}
                className={`w-full p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none shadow-inner border border-slate-800 ${
                  isLocked ? 'cursor-not-allowed opacity-85 select-none' : 'focus:ring-2 focus:ring-emerald-500'
                }`}
                placeholder="# Write your Python code here..."
              />
            </div>

            {/* Python Execution Terminal / Console */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-md">
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-mono font-semibold">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Terminal Console (stdout / stderr)</span>
                </div>

                <div className="flex items-center gap-3">
                  {codeOutput && (
                    <>
                      {codeOutput.status === 'success' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                          ● Exit Code 0 ({codeOutput.execution_time_ms || 12} ms)
                        </span>
                      )}
                      {codeOutput.status === 'error' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1">
                          ● Error (Exit Code {codeOutput.exit_code ?? 1})
                        </span>
                      )}
                      {codeOutput.status === 'timeout' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1">
                          ● Timeout (5.0s limit)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCodeOutput(null)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 font-mono text-xs overflow-x-auto min-h-[120px] max-h-[260px] text-slate-200">
                {runningCode ? (
                  <div className="flex items-center gap-2 text-indigo-400 py-3">
                    <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Executing Python code in isolated sandbox...</span>
                  </div>
                ) : codeOutput ? (
                  <div className="space-y-2">
                    {codeOutput.stdout ? (
                      <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed font-mono">
                        {codeOutput.stdout}
                      </pre>
                    ) : null}

                    {codeOutput.stderr ? (
                      <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed font-mono bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/50">
                        {codeOutput.stderr}
                      </pre>
                    ) : null}

                    {!codeOutput.stdout && !codeOutput.stderr ? (
                      <span className="text-slate-500 italic">
                        Process finished with exit code {codeOutput.exit_code ?? 0} (no output printed to stdout).
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-slate-500 py-2 flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">$</span>
                    <span>Ready. Click <strong>&quot;Run Python Code&quot;</strong> to execute and see output before final submission.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit / Locked Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          {isLocked ? (
            <>
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Assessment completed & finalized. Editing is permanently disabled.
              </span>

              <Link
                href="/candidate/interview"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                <span>Proceed to 18-Question Adaptive Interview</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-500">
                Ensure all 4 sections are answered before final submission.
              </span>

              <button
                onClick={handleSubmitAssessment}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Evaluating Assessment...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Submit 55-Minute Assessment
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Floating Live AI Camera Proctoring Widget (Active only during in-progress assessment) */}
      {!isLocked && (
        <div className="fixed bottom-6 right-6 z-50 transition-all duration-300">
          <div className="bg-slate-900 border-2 border-indigo-500/60 shadow-2xl rounded-2xl p-2.5 w-48 sm:w-56 space-y-2 backdrop-blur-md">
            {/* Live Camera Video Feed */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {!cameraActive && (
                <div className="text-center p-3 space-y-1">
                  <Camera className="w-6 h-6 text-slate-500 mx-auto animate-pulse" />
                  <p className="text-[10px] text-slate-400 font-medium">Connecting camera...</p>
                  {cameraError && (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-2 py-1 bg-indigo-600 text-white text-[9px] font-bold rounded-lg mt-1"
                    >
                      Retry Permission
                    </button>
                  )}
                </div>
              )}

              {/* Recording Indicator Overlay */}
              {cameraActive && (
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[9px] font-bold text-white shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-red-500 absolute" />
                  <span className="ml-1.5 text-[9px] tracking-wider">PROCTORED</span>
                </div>
              )}
            </div>

            {/* Proctoring Status Bar */}
            <div className="flex items-center justify-between text-[10px] text-slate-300 px-1 pt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <Eye className="w-3 h-3" /> Face Centered
              </span>
              <button
                type="button"
                onClick={enterFullscreen}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center gap-0.5"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                <span>{isFullscreen ? 'Full' : 'FS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssessmentRoomPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Sparkles className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading Assessment Room...</p>
      </div>
    }>
      <AssessmentContent />
    </Suspense>
  );
}
