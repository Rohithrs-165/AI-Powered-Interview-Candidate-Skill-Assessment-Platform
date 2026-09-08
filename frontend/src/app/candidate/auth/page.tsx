'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BrainCircuit, Lock, Mail, User, Sparkles, CheckCircle2, 
  ArrowRight, AlertCircle, Phone, Briefcase, GraduationCap, 
  Award, FileText, UploadCloud
} from 'lucide-react';
import { api } from '@/lib/api';

export default function AuthPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'register') {
        setIsRegister(true);
      }
    }
  }, []);

  // Form Fields
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        // Direct Registration without OTP gate
        const res = await api.register({
          full_name: fullName,
          email,
          phone,
          password,
          current_role: role,
          experience_years: experienceChoice === '0-1 years' ? 1.0 : experienceChoice === '1-3 years' ? 2.5 : 4.0,
          experience_choice: experienceChoice,
          education,
          certifications,
          internship_details: internshipDetails
        });

        if (res.access_token) {
          localStorage.setItem('token', res.access_token);
        }
        localStorage.setItem('role', 'candidate');
        if (res.candidate) {
          localStorage.setItem('candidate_id', res.candidate.candidate_id);
          localStorage.setItem('candidate_name', res.candidate.full_name);
          localStorage.setItem('candidate_email', res.candidate.email);
          localStorage.setItem('candidate_role', res.candidate.current_role || 'Software Engineer');

          // Upload resume if selected
          if (resumeFile) {
            const formData = new FormData();
            formData.append('file', resumeFile);
            formData.append('candidate_id', res.candidate.candidate_id);
            await api.uploadResume(formData).catch(e => console.warn('Resume upload notice:', e));
          }
        }
        // Direct redirect into Candidate Portal
        router.push('/candidate');
      } else {
        const res = await api.login({ email, password });
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
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-sm">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isRegister ? 'Candidate Onboarding & Sign Up' : 'Candidate Sign In'}
        </h1>
        <p className="text-xs text-slate-500">
          {isRegister
            ? 'Complete your candidate profile, experience details, and resume submission'
            : 'Access your active job applications, 55-minute assessment, and adaptive interview'}
        </p>
      </div>

      <div className="glass-card p-7 sm:p-8 rounded-3xl space-y-5">
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
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4" />
              {error}
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
              'Complete Sign Up & Enter Portal'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="text-center pt-2 space-y-2">
          <button
            onClick={() => setIsRegister(!isRegister)}
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
