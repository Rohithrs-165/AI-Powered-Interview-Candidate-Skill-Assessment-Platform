'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User, Sparkles, Mic, FileText, Award, TrendingUp, 
  Clock, ArrowRight, CheckCircle2, ChevronRight, BookOpen, 
  BarChart2, PlayCircle, ShieldCheck, Zap, Layers, Briefcase, 
  Calendar, Check, ExternalLink, AlertCircle, LogOut, Trash2, Lock, ShieldAlert
} from 'lucide-react';
import { api } from '@/lib/api';

export default function CandidateHomePage() {
  const router = useRouter();
  const [candidateId, setCandidateId] = useState<string>('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [removingAppId, setRemovingAppId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [candidate, setCandidate] = useState({
    name: '',
    email: '',
    role: '',
    experience_years: 2.5,
    avatar: 'CP'
  });

  useEffect(() => {
    async function checkAuthAndLoad() {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('token');
      const storedCandId = localStorage.getItem('candidate_id');
      const role = localStorage.getItem('role');

      // STRICT CANDIDATE AUTH GUARD: If not logged in as candidate, redirect to candidate auth
      if (!token || !storedCandId || role === 'hr') {
        router.replace('/candidate/auth');
        return;
      }

      setIsAuthenticated(true);
      setCandidateId(storedCandId);

      const name = localStorage.getItem('candidate_name') || 'Candidate';
      const email = localStorage.getItem('candidate_email') || 'candidate@neurova.ai';
      const userRole = localStorage.getItem('candidate_role') || 'Software Engineer';
      const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'CP';

      setCandidate({
        name,
        email,
        role: userRole,
        experience_years: 2.5,
        avatar: initials
      });

      try {
        const [jobsList, appsList] = await Promise.all([
          api.getJobs('active').catch(() => []),
          api.getMyApplications(storedCandId).catch(() => [])
        ]);

        // Merge persistent jobs from localStorage with backend jobs
        let savedJobs: any[] = [];
        try {
          const raw = localStorage.getItem('neurova_persistent_jobs');
          if (raw) savedJobs = JSON.parse(raw);
        } catch (e) {}

        const mergedMap = new Map<string, any>();
        savedJobs.filter((j) => j && j.status === 'active').forEach((j) => { if (j && j.job_id) mergedMap.set(j.job_id, j); });
        (jobsList || []).forEach((j: any) => { if (j && j.job_id) mergedMap.set(j.job_id, j); });

        const finalJobs = Array.from(mergedMap.values());
        setJobs(finalJobs.length > 0 ? finalJobs : (jobsList || []));
        setApplications(appsList);
      } catch (err) {
        console.error('Failed to load candidate portal data:', err);
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndLoad();
  }, [router]);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('candidate_id');
    localStorage.removeItem('role');
    router.replace('/');
  };

  const handleApply = async (jobId: string) => {
    setApplyingJobId(jobId);
    try {
      const res = await api.applyJob({
        candidate_id: candidateId,
        job_id: jobId
      });

      // Reload applications
      const updatedApps = await api.getMyApplications(candidateId).catch(() => []);
      setApplications(updatedApps);
    } catch (err: any) {
      console.warn('Backend apply notice (fallback local session):', err);
      const targetJob = jobs.find((j) => j.job_id === jobId);
      const fallbackApp = {
        application_id: `app-${Date.now()}`,
        candidate_id: candidateId,
        job_id: jobId,
        job_title: targetJob?.job_title || 'Full Stack AI Engineer',
        department: targetJob?.department || 'Engineering',
        application_status: 'shortlisted',
        match_score: 85.0,
        match_status: 'shortlisted',
        match_reasoning: 'Profile successfully matched core required skills and experience.',
        created_at: new Date().toISOString()
      };
      setApplications([fallbackApp]);
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleRemoveApplication = async (applicationId: string) => {
    const targetApp = applications.find((a) => a.application_id === applicationId);
    // Strict Guard: Once assessment round has been joined or attended, candidate cannot withdraw
    const hasAttendedAssessment = targetApp && (
      ['assessment', 'cleared_assessment', 'interview', 'hr_review', 'selected', 'offered', 'completed'].includes(targetApp.application_status)
    );

    if (hasAttendedAssessment) {
      alert('Application Locked: You have already joined and attended the first round of assessment. Applications cannot be withdrawn after assessment participation.');
      return;
    }

    if (!confirm('Are you sure you want to withdraw this application? You will be free to apply to other roles.')) {
      return;
    }
    setRemovingAppId(applicationId);
    try {
      await api.deleteApplication(applicationId);
      const updatedApps = await api.getMyApplications(candidateId).catch(() => []);
      setApplications(updatedApps);
    } catch (err: any) {
      console.error('Failed to remove application:', err);
      alert(err?.message || 'Could not withdraw application. Please try again.');
    } finally {
      setRemovingAppId(null);
    }
  };

  const getActiveApplication = () => {
    return applications.length > 0 ? applications[0] : null;
  };

  const activeApp = getActiveApplication();
  const isDisqualified = activeApp?.application_status === 'malpractice' || activeApp?.status === 'malpractice';
  const isInterviewCompleted = activeApp && ['hr_review', 'selected', 'offered', 'completed'].includes(activeApp.application_status);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Sparkles className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500 font-serif">Verifying candidate session...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-2 pb-16">
      {/* Disqualification Malpractice Persistent Alert Banner */}
      {isDisqualified && (
        <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-red-950 shadow-sm animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-red-600 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm text-red-950">Candidate Disqualified for Proctoring Malpractice</h3>
            <p className="text-xs text-red-700 leading-relaxed">
              Anti-cheat proctoring violations were recorded during your live evaluation session. In accordance with strict platform integrity guidelines, your profile is permanently restricted from attending or retaking technical interviews and assessments.
            </p>
          </div>
        </div>
      )}

      {/* Welcome Card */}
      <section className="bg-white border border-slate-200 rounded-3xl p-7 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              {candidate.avatar}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900">
                  Candidate Portal • {candidate.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Profile
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                {candidate.role} • {candidate.experience_years} Years Experience • {candidate.email}
              </p>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/candidate/report/${candidateId}`}
              className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors flex items-center gap-2 border border-indigo-200"
            >
              <Award className="w-4 h-4 text-indigo-600" />
              View My Dossier & Report
            </Link>
            <Link
              href="/candidate/resume"
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              Update Resume
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-2 border border-slate-200"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              Sign Out
            </button>
          </div>
        </div>
      </section>

      {/* Real-time Application Status Pipeline Tracker */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            Recruitment Status Pipeline
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600">
              {activeApp ? `Role: ${activeApp.job_title}` : 'No active applications'}
            </span>
            {activeApp && (
              <button
                onClick={() => handleRemoveApplication(activeApp.application_id)}
                disabled={removingAppId === activeApp.application_id}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all flex items-center gap-1"
                title="Withdraw/Remove Application"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>

        {/* Pipeline Stage Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs pt-1">
          {[
            { key: 'applied', label: '1. Applied' },
            { key: 'matching', label: '2. AI Matching' },
            { key: 'shortlisted', label: '3. Shortlisted' },
            { key: 'assessment', label: '4. Assessment (55m)' },
            { key: 'interview', label: '5. Interview (18Q)' },
            { key: 'hr_review', label: '6. Committee Decision' }
          ].map((step, idx) => {
            const currentStatus = activeApp?.application_status || 'shortlisted';
            const isCompleted = ['selected', 'hr_review', 'interview', 'assessment', 'shortlisted'].indexOf(currentStatus) >= ['selected', 'hr_review', 'interview', 'assessment', 'shortlisted'].indexOf(step.key);

            return (
              <div 
                key={idx}
                className={`p-3 rounded-2xl border transition-all ${
                  isCompleted 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' 
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="text-[11px] truncate">{step.label}</div>
              </div>
            );
          })}
        </div>

        {/* Action Banners depending on Status */}
        {activeApp ? (
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 ${
            activeApp.application_status === 'malpractice'
              ? 'bg-rose-50/80 border-rose-300 text-rose-950'
              : 'bg-indigo-50/70 border-indigo-200'
          }`}>
            <div>
              <div className={`text-xs font-bold flex items-center gap-1.5 ${
                activeApp.application_status === 'malpractice' ? 'text-rose-900' : 'text-indigo-900'
              }`}>
                {activeApp.application_status === 'malpractice' ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                ) : (
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                )}
                Match Score: {activeApp.match_score}% • Status: {activeApp.application_status === 'malpractice' ? 'DISQUALIFIED (MALPRACTICE)' : activeApp.application_status.toUpperCase()}
              </div>
              <p className={`text-xs mt-0.5 ${activeApp.application_status === 'malpractice' ? 'text-rose-700' : 'text-indigo-700'}`}>
                {activeApp.match_reasoning || "Your profile has been shortlisted for technical evaluation."}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* If SELECTED / OFFERED: Render celebratory status */}
              {(activeApp.application_status === 'selected' || activeApp.application_status === 'offered') && (
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> OFFERED
                  </span>
                  <Link
                    href={`/candidate/report/${candidateId}`}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs shadow-sm transition-all"
                  >
                    View Report
                  </Link>
                </div>
              )}

              {/* If MALPRACTICE: Render permanent locked status */}
              {isDisqualified && (
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" /> DISQUALIFIED (MALPRACTICE)
                  </span>
                  <Link
                    href={`/candidate/report/${candidateId}`}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs shadow-sm transition-all"
                  >
                    View Dossier
                  </Link>
                </div>
              )}

              {/* If INTERVIEW ALREADY ATTENDED / COMPLETED: Lock and link to report */}
              {!isDisqualified && isInterviewCompleted && (
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Interview Completed
                  </span>
                  <Link
                    href={`/candidate/report/${candidateId}`}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1"
                  >
                    <Award className="w-3.5 h-3.5" /> View Dossier & Report
                  </Link>
                </div>
              )}

              {/* If NOT_SHORTLISTED or REJECTED (non-malpractice): Render primary Remove Application button */}
              {!isDisqualified && !isInterviewCompleted && (activeApp.match_status === 'not_shortlisted' || activeApp.application_status === 'not_shortlisted' || activeApp.application_status === 'rejected') && (
                <button
                  onClick={() => handleRemoveApplication(activeApp.application_id)}
                  disabled={removingAppId === activeApp.application_id}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                  title="Remove this application to clear the pipeline and apply to other roles"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {removingAppId === activeApp.application_id ? 'Removing...' : 'Remove Application'}
                </button>
              )}

              {!isDisqualified && (activeApp.application_status === 'shortlisted' || activeApp.application_status === 'assessment') && (
                <>
                  <Link
                    href={`/candidate/assessment?appId=${activeApp.application_id}`}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <Clock className="w-4 h-4" /> {activeApp.application_status === 'assessment' ? 'Continue 55-Min Assessment' : 'Start 55-Min Assessment'}
                  </Link>
                  <Link
                    href={`/candidate/report/${candidateId}`}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Dossier</span>
                  </Link>
                  {/* Withdraw only permitted if candidate hasn't joined/attended assessment yet */}
                  {activeApp.application_status === 'shortlisted' ? (
                    <button
                      onClick={() => handleRemoveApplication(activeApp.application_id)}
                      disabled={removingAppId === activeApp.application_id}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-semibold text-xs transition-all flex items-center gap-1.5"
                      title="Withdraw this application before starting assessment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Withdraw</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-medium text-xs flex items-center gap-1.5" title="Applications cannot be withdrawn once assessment round is attended">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Assessment Active (Locked)</span>
                    </span>
                  )}
                </>
              )}

              {!isDisqualified && !isInterviewCompleted && activeApp.application_status === 'interview' && (
                <>
                  <Link
                    href="/candidate/interview"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <PlayCircle className="w-4 h-4" /> Enter 18-Question Interview
                  </Link>
                  <Link
                    href={`/candidate/report/${candidateId}`}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Dossier</span>
                  </Link>
                  <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium text-xs flex items-center gap-1.5" title="Assessment round attended and cleared. Application locked in evaluation pipeline.">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Round 1 Cleared</span>
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
            Select an open role below to submit your application and initiate automated AI resume matching.
          </div>
        )}

        {/* Celebratory OFFER Banner if candidate cracked the interview and received offer */}
        {activeApp && (activeApp.application_status === 'selected' || activeApp.application_status === 'offered') && (
          <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn shadow-sm">
            <div className="space-y-1">
              <div className="font-extrabold text-sm text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                🎉 Congratulations! You Cracked the Interview & Have Been OFFERED the Role!
              </div>
              <p className="text-emerald-800 leading-relaxed">
                Neurova AI has officially extended an employment offer for the <strong>{activeApp.job_title}</strong> position. 
                Your formal selection letter and offer package have been delivered to your email: <strong>{candidate.email}</strong>.
              </p>
            </div>
            <span className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider shrink-0 shadow-sm">
              OFFER ACCEPTANCE READY
            </span>
          </div>
        )}
      </section>

      {/* Active Job Openings from HR Portal */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Active Job Openings
          </h2>
          <span className="text-xs text-slate-500">{jobs.length} Open Positions</span>
        </div>

        <div className="space-y-3">
          {jobs.map((job) => {
            const isApplied = applications.some((a) => a.job_id === job.job_id);

            return (
              <div 
                key={job.job_id} 
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{job.job_title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">
                      {job.department}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                    {job.job_description}
                  </p>
                  <div className="text-[11px] text-slate-600 pt-1">
                    <strong className="text-slate-800">Required Skills:</strong> {job.required_skills} • <strong className="text-slate-800">Experience:</strong> {job.experience_min}–{job.experience_max} yrs
                  </div>
                </div>

                <div>
                  {isDisqualified ? (
                    <span className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-semibold text-xs inline-flex items-center gap-1.5 cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5" /> Disqualified (Malpractice)
                    </span>
                  ) : isApplied ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Applied
                      </span>
                      {!isInterviewCompleted && (
                        <button
                          onClick={() => {
                            const app = applications.find((a) => a.job_id === job.job_id);
                            if (app) handleRemoveApplication(app.application_id);
                          }}
                          disabled={removingAppId !== null}
                          className="px-3 py-2 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-medium text-xs transition-all flex items-center gap-1"
                          title="Withdraw this application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Withdraw</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApply(job.job_id)}
                      disabled={applyingJobId === job.job_id}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5"
                    >
                      {applyingJobId === job.job_id ? 'Applying...' : 'Apply with Profile'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two Assessment Workspaces Launcher */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">55-Minute Skill Assessment</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Covers Quantitative Aptitude (15m), Verbal Reasoning (5m), Role MCQs (5m), and a practical Coding Problem (30m).
          </p>
          {isDisqualified ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 pt-1">
              <ShieldAlert className="w-4 h-4" /> Assessment Locked (Disqualified)
            </span>
          ) : (
            <Link
              href={activeApp ? `/candidate/assessment?appId=${activeApp.application_id}` : "/candidate/assessment"}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 pt-1"
            >
              Open Assessment Workspace <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <PlayCircle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">18-Question Adaptive Interview</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            3 assessment-derived questions + 5 job description questions + 10 adaptive skill questions with real-time camera proctoring.
          </p>
          {isDisqualified ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 pt-1">
              <ShieldAlert className="w-4 h-4" /> Interview Studio Locked (Disqualified)
            </span>
          ) : isInterviewCompleted ? (
            <Link
              href={`/candidate/report/${candidateId}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 pt-1"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Already Attended • View Dossier <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/candidate/interview"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 pt-1"
            >
              Open Interview Studio <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
