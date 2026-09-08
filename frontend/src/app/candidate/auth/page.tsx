'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BrainCircuit, Lock, Mail, User, Sparkles, CheckCircle2, 
  ArrowRight, AlertCircle, Phone, Briefcase, GraduationCap, 
  Award, FileText, UploadCloud, ShieldCheck, ArrowLeft, RefreshCw, KeyRound
} from 'lucide-react';
import { api } from '@/lib/api';

export default function AuthPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);

  // 2-Step Verification state (For Candidate Sign Up Alone)
  const [signupStep, setSignupStep] = useState<1 | 2>(1); // 1 = Details, 2 = 2-Step OTP
  const [otpCode, setOtpCode] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [candidateSession, setCandidateSession] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'register') {
        setIsRegister(true);
      }
    }
  }, []);

  // Countdown timer for Resend OTP in Step 2
  useEffect(() => {
    let interval: any = null;
    if (signupStep === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [signupStep, resendTimer]);

  // Candidate Registration Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Full Stack AI Engineer');
  const [experienceChoice, setExperienceChoice] = useState('1-3 years');
  const [education, setEducation] = useState('B.S. in Computer Science');
  const [certifications, setCertifications] = useState('AWS Certified Developer');
  const [internshipDetails, setInternshipDetails] = useState('Software engineering internship working with modern web and backend technologies.');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  // Step 1: Submit Details / Or Direct Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        // STEP 1 OF 2: Submit profile and dispatch 6-digit OTP asynchronously
        const res = await api.register({
          full_name: fullName,
          email: email.trim().toLowerCase(),
          phone,
          password,
          current_role: role,
          experience_years: experienceChoice === '0-1 years' ? 1.0 : experienceChoice === '1-3 years' ? 2.5 : 4.0,
          experience_choice: experienceChoice,
          education,
          certifications,
          internship_details: internshipDetails
        });

        // Backend registers candidate and dispatches 6-digit OTP email in background
        setRegisteredEmail(email.trim().toLowerCase());
        setCandidateSession(res.candidate || null);
        setSignupStep(2); // Instantly advance to Step 2
        setResendTimer(30);
        setCanResend(false);
        setResendStatus('Verification code sent to your email.');
      } else {
        // CANDIDATE SIGN IN (Single-step direct login - no OTP required)
        const res = await api.login({ email: email.trim().toLowerCase(), password });
        if (res.access_token) {
          localStorage.setItem('token', res.access_token);
        }
        if (res.role === 'hr') {
          localStorage.setItem('role', 'hr');
          router.push('/hr/dashboard');
        } else {
          localStorage.setItem('role', 'candidate');
          if (res.candidate) {
            localStorage.setItem('candidate_id', res.candidate.candidate_id);
            localStorage.setItem('candidate_name', res.candidate.full_name);
            localStorage.setItem('candidate_email', res.candidate.email);
            localStorage.setItem('candidate_role', res.candidate.current_role || 'Software Engineer');
          } else {
            localStorage.setItem('candidate_id', 'cand_demo_1');
          }
          router.push('/candidate');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication request failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP and complete signup
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpCode).replace(/\D/g, '').trim();
    if (code.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setVerifyingOtp(true);
    setError('');

    try {
      const targetEmail = registeredEmail || email.trim().toLowerCase();
      const res = await api.verifyOtp({
        email: targetEmail,
        otp: code,
      });

      if (res.access_token) {
        localStorage.setItem('token', res.access_token);
      }
      localStorage.setItem('role', 'candidate');

      const cand = res.candidate || candidateSession;
      if (cand) {
        localStorage.setItem('candidate_id', cand.candidate_id);
        localStorage.setItem('candidate_name', cand.full_name);
        localStorage.setItem('candidate_email', cand.email);
        localStorage.setItem('candidate_role', cand.current_role || 'Software Engineer');

        // Asynchronously upload resume if selected during onboarding
        if (resumeFile) {
          const formData = new FormData();
          formData.append('file', resumeFile);
          formData.append('candidate_id', cand.candidate_id);
          await api.uploadResume(formData).catch(e => console.warn('Resume upload notice:', e));
        }
      }

      // Fast transition directly into Candidate Portal
      router.push('/candidate');
    } catch (err: any) {
      setError(err.message || 'Invalid 6-digit verification code. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Fast Auto-submit as soon as 6 digits are typed
  const handleOtpInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(val);
    setError('');
    if (val.length === 6) {
      handleVerifyOtp(val);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (!canResend) return;
    setResendStatus('Dispatching new code...');
    setError('');
    try {
      const targetEmail = registeredEmail || email.trim().toLowerCase();
      await api.resendOtp({ email: targetEmail });
      setResendTimer(30);
      setCanResend(false);
      setResendStatus('New 6-digit verification code sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please wait a moment.');
      setResendStatus('');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-sm">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {!isRegister 
            ? 'Candidate Sign In' 
            : signupStep === 1 
              ? 'Candidate Onboarding & Sign Up' 
              : '2-Step Verification'}
        </h1>
        <p className="text-xs text-slate-500">
          {!isRegister
            ? 'Access your active job applications, 55-minute assessment, and adaptive interview'
            : signupStep === 1
              ? 'Step 1 of 2: Candidate profile, skills experience, and resume submission'
              : `Step 2 of 2: Confirm your identity with the code sent to ${registeredEmail || email}`}
        </p>
      </div>

      {/* Progress Indicator for Sign Up */}
      {isRegister && (
        <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
              {signupStep === 2 ? '✓' : '1'}
            </span>
            <span>Profile</span>
          </div>
          <div className={`h-0.5 w-10 ${signupStep === 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${signupStep === 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${signupStep === 2 ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
              2
            </span>
            <span>Security OTP</span>
          </div>
        </div>
      )}

      <div className="glass-card p-7 sm:p-8 rounded-3xl space-y-5">
        {/* STEP 2 VIEW: Fast 6-Digit Email OTP Verification */}
        {isRegister && signupStep === 2 ? (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-sm">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Enter 6-Digit Verification Code</h2>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                We sent a real-time verification email to{' '}
                <strong className="text-indigo-600 font-semibold">{registeredEmail || email}</strong>.
                Enter the 6 digits below:
              </p>
            </div>

            {resendStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs text-center font-medium">
                {resendStatus}
              </div>
            )}

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  maxLength={6}
                  value={otpCode}
                  onChange={handleOtpInput}
                  placeholder="••••••"
                  className="w-full text-center text-3xl font-mono font-extrabold tracking-[0.4em] py-3.5 px-4 rounded-2xl bg-slate-50 border-2 border-indigo-200 focus:border-indigo-600 focus:bg-white text-slate-900 transition-all outline-none"
                />
              </div>
              <p className="text-[11px] text-center text-slate-400">
                Tip: Code will auto-verify as soon as 6 digits are typed.
              </p>
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={verifyingOtp || otpCode.length < 6}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {verifyingOtp ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-white" />
                    Verifying Code...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    Verify & Enter Candidate Portal
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSignupStep(1);
                    setError('');
                  }}
                  className="text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to details
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend}
                  className={`flex items-center gap-1 font-semibold transition-colors ${
                    canResend 
                      ? 'text-indigo-600 hover:text-indigo-700 cursor-pointer' 
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}
                </button>
              </div>

              {/* Fast Developer / Demo Master Fallback Hint */}
              <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setOtpCode('123456');
                    handleVerifyOtp('123456');
                  }}
                  className="text-[11px] text-slate-400 hover:text-indigo-600 underline"
                >
                  Quick test? Click here to autofill fallback code (123456)
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 1 VIEW: Registration Details or Single-Step Login */
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rohith R S"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Level</label>
                    <select
                      value={experienceChoice}
                      onChange={(e) => setExperienceChoice(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                    >
                      <option value="0-1 years">0–1 years (Entry / Fresher)</option>
                      <option value="1-3 years">1–3 years (Associate / Mid)</option>
                      <option value="3-5 years">3–5 years (Senior)</option>
                      <option value="5+ years">5+ years (Staff / Principal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Role</label>
                    <input
                      type="text"
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Full Stack AI Engineer"
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Education</label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      placeholder="e.g. B.Tech in Computer Science"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Certifications & Credentials</label>
                  <div className="relative">
                    <Award className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={certifications}
                      onChange={(e) => setCertifications(e.target.value)}
                      placeholder="e.g. AWS Certified Solutions Architect, Kubernetes CKA"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Internship & Project Details</label>
                  <textarea
                    rows={2}
                    value={internshipDetails}
                    onChange={(e) => setInternshipDetails(e.target.value)}
                    placeholder="Summary of engineering internships or key open-source contributions..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Resume Upload Dropzone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Resume File (PDF / TXT / DOCX)</label>
                  <div className="p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-between">
                    <span className="text-xs text-slate-600 truncate max-w-[280px]">
                      {resumeFile ? resumeFile.name : 'Upload PDF, TXT, or DOCX resume'}
                    </span>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-sm hover:bg-slate-100">
                      Browse
                      <input
                        type="file"
                        accept=".pdf,.txt,.docx"
                        onChange={handleResumeFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Sparkles className="w-4 h-4 animate-spin text-white" />
              ) : isRegister ? (
                <>
                  <span>Continue to 2-Step Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        <div className="text-center pt-2 space-y-2">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setSignupStep(1);
              setOtpCode('');
              setError('');
            }}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            {isRegister ? 'Already registered? Sign In' : 'New candidate? Create an Account (Sign Up)'}
          </button>

          {!isRegister && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Quick Demo Logins (Password: Password123!):</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('rohith.rs@neurova.ai');
                    setPassword('Password123!');
                  }}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] font-medium text-slate-600 transition-colors"
                >
                  Rohith R S (AI Eng)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('elena.rostova@techmail.io');
                    setPassword('Password123!');
                  }}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] font-medium text-slate-600 transition-colors"
                >
                  Elena Rostova (Backend)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('marcus.chen@clouddev.org');
                    setPassword('Password123!');
                  }}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] font-medium text-slate-600 transition-colors"
                >
                  Marcus Chen (Cloud)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

