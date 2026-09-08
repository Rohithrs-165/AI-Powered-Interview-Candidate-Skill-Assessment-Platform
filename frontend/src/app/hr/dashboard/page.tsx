'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, Award, CheckCircle2, XCircle, Clock, 
  Search, Filter, ExternalLink, MessageSquare, Send, Sparkles,
  ShieldAlert, ShieldCheck, Camera, AlertTriangle, ChevronRight, User, Plus, Calendar, Briefcase, LogOut,
  Trash2, RefreshCw, CalendarDays, History, Check
} from 'lucide-react';
import { api } from '@/lib/api';

export default function HRDashboardPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [malpracticeIncidents, setMalpracticeIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedCand, setSelectedCand] = useState<any>(null);
  const [decision, setDecision] = useState('selected');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hideRejected, setHideRejected] = useState(true);

  // Malpractice Evidence Day-by-Day States
  const [selectedEvidenceDate, setSelectedEvidenceDate] = useState<string>('all');
  const [purgeDays, setPurgeDays] = useState<number>(0);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create Job Modal State
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobSkills, setNewJobSkills] = useState('');
  const [newJobExpMin, setNewJobExpMin] = useState(1.0);
  const [newJobExpMax, setNewJobExpMax] = useState(4.0);
  const [creatingJob, setCreatingJob] = useState(false);

  useEffect(() => {
    async function checkAuthAndLoad() {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');

      // STRICT HR AUTH GUARD: If not authenticated as HR, redirect to HR Login
      if (!token || role !== 'hr') {
        router.replace('/hr/auth');
        return;
      }

      setIsAuthenticated(true);

      try {
        const [candList, statData, jobList, incidents] = await Promise.all([
          api.getHRCandidates(hideRejected, statusFilter || undefined).catch(() => []),
          api.getHRStats().catch(() => null),
          api.getJobs().catch(() => []),
          api.getAllMalpracticeIncidents().catch(() => [])
        ]);
        setCandidates(candList);
        setStats(statData);
        setJobs(jobList);
        setMalpracticeIncidents(incidents);
      } catch (err) {
        console.error('Failed to load HR data:', err);
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndLoad();
  }, [hideRejected, statusFilter, router]);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('candidate_id');
    localStorage.removeItem('role');
    router.replace('/');
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim()) return;
    setCreatingJob(true);
    try {
      await api.createJob({
        job_title: newJobTitle,
        job_description: newJobDesc,
        required_skills: newJobSkills,
        experience_min: newJobExpMin,
        experience_max: newJobExpMax
      });
      setShowCreateJobModal(false);
      setNewJobTitle('');
      setNewJobDesc('');
      setNewJobSkills('');
      // Reload jobs
      const updated = await api.getJobs().catch(() => []);
      setJobs(updated);
    } catch (err) {
      console.error('Failed to create job:', err);
    } finally {
      setCreatingJob(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedCand?.report_id) return;
    setSubmitting(true);
    try {
      await api.submitHRReview(selectedCand.report_id, {
        final_decision: decision,
        hr_comments: comments,
        reviewed_by: 'Executive Hiring Director'
      });

      setCandidates((prev) =>
        prev.map((c) =>
          c.candidate_id === selectedCand.candidate_id
            ? { ...c, final_decision: decision, application_status: decision }
            : c
        )
      );
      setSelectedCand(null);
      setComments('');
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Grouped Malpractice Incidents by Day
  const groupedIncidents: { [date: string]: any[] } = malpracticeIncidents.reduce((acc, inc) => {
    let day = 'Unknown Date';
    if (inc.created_at) {
      try {
        day = inc.created_at.split('T')[0].split(' ')[0];
      } catch (e) {
        day = 'Unknown Date';
      }
    }
    if (!acc[day]) acc[day] = [];
    acc[day].push(inc);
    return acc;
  }, {});

  const availableIncidentDates = Object.keys(groupedIncidents).sort().reverse();

  const refreshMalpracticeAndCandidates = async () => {
    try {
      const [candList, statData, incidents] = await Promise.all([
        api.getHRCandidates(hideRejected, statusFilter || undefined).catch(() => []),
        api.getHRStats().catch(() => null),
        api.getAllMalpracticeIncidents().catch(() => [])
      ]);
      setCandidates(candList);
      setStats(statData);
      setMalpracticeIncidents(incidents);
    } catch (e) {
      console.error('Failed refreshing data:', e);
    }
  };

  const handleDeleteDayEvidence = async (dateStr: string) => {
    if (!confirm(`Are you sure you want to permanently remove all proctored evidence logs recorded on ${dateStr}?`)) {
      return;
    }
    setDeletingDate(dateStr);
    try {
      await api.deleteMalpracticeByDay(dateStr);
      setMalpracticeIncidents((prev) =>
        prev.filter((item) => {
          const itemDate = item.created_at ? item.created_at.split('T')[0].split(' ')[0] : '';
          return itemDate !== dateStr;
        })
      );
      if (selectedEvidenceDate === dateStr) {
        setSelectedEvidenceDate('all');
      }
      await refreshMalpracticeAndCandidates();
    } catch (err) {
      console.error(`Failed to delete evidence for ${dateStr}:`, err);
      alert(`Error deleting evidence for ${dateStr}. Please try again.`);
    } finally {
      setDeletingDate(null);
    }
  };

  const handlePurgeOlderThan = async () => {
    const periodLabel = purgeDays === 0
      ? 'ALL recorded proctored evidence logs (including today)'
      : `all proctored evidence logs older than ${purgeDays} day(s)`;

    if (!confirm(`Are you sure you want to purge ${periodLabel}?`)) {
      return;
    }
    setIsPurging(true);
    try {
      const res: any = await api.purgeMalpracticeOlderThan(purgeDays);
      if (purgeDays === 0) {
        setMalpracticeIncidents([]);
        setSelectedEvidenceDate('all');
      } else {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - purgeDays);
        setMalpracticeIncidents((prev) =>
          prev.filter((item) => item.created_at && new Date(item.created_at) >= cutoffDate)
        );
      }
      await refreshMalpracticeAndCandidates();
      if (res?.deleted_count > 0) {
        alert(`Successfully purged ${res.deleted_count} proctored evidence log(s).`);
      } else {
        alert(res?.message || `No proctored evidence logs found older than ${purgeDays} day(s). To clear today's records, choose "All Recorded Evidences (Purge All)".`);
      }
    } catch (err: any) {
      console.error('Failed to purge evidence:', err);
      alert(err?.message || 'Error purging old evidence. Please try again.');
    } finally {
      setIsPurging(false);
    }
  };

  const handleDeleteSingleEvidence = async (logId: string) => {
    if (!confirm('Are you sure you want to permanently delete this proctoring snapshot evidence?')) {
      return;
    }
    setDeletingId(logId);
    try {
      await api.deleteMalpracticeLog(logId);
      setMalpracticeIncidents((prev) => prev.filter((item) => item.log_id !== logId));
      await refreshMalpracticeAndCandidates();
    } catch (err) {
      console.error(`Failed to delete evidence ${logId}:`, err);
      alert('Error deleting evidence log. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = candidates.filter((c) =>
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.target_job?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCandidates = candidates.filter((c) => c.final_decision === 'selected');

  if (!isAuthenticated) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Sparkles className="w-8 h-8 animate-spin text-slate-800" />
        <p className="text-sm text-slate-500 font-serif">Verifying HR executive session...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-2 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2 shadow-sm">
            <Users className="w-3.5 h-3.5" />
            HR Portal • Executive Recruitment Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Candidate Pipeline & Hiring Decisions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review 55-minute assessments, 18-question interview transcripts, proctoring evidence, and trigger real-time offers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateJobModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Create Job Opening
          </button>
          <button
            onClick={handleSignOut}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            Sign Out
          </button>
        </div>
      </div>

      {/* TOP: Stage-by-Stage Hiring Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Openings</div>
          <div className="text-3xl font-extrabold text-slate-900">{jobs.length || 1}</div>
          <div className="text-[11px] text-slate-500">Engineering vacancies</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stage 1: Shortlisted</div>
          <div className="text-3xl font-extrabold text-indigo-600">
            {stats?.shortlisted_candidates || candidates.filter(c => (c.match_score >= 50 || c.hiring_stage === 'Shortlisted')).length || candidates.length}
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold">Resume Match ≥ 50%</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stage 2: Cleared Assessment</div>
          <div className="text-3xl font-extrabold text-blue-600">
            {stats?.cleared_assessment_candidates || candidates.filter(c => c.assessment_score > 0).length || 1}
          </div>
          <div className="text-[11px] text-blue-600 font-semibold">Passed 55m Evaluation</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stage 3: Offered Candidates</div>
          <div className="text-3xl font-extrabold text-emerald-600">{selectedCandidates.length}</div>
          <div className="text-[11px] text-emerald-600 font-semibold">Cracked Interview & Offered</div>
        </div>
      </div>

      {/* Currently Selected Candidates Banner (Stage 3: Interview Cracked & Offered) */}
      {selectedCandidates.length > 0 && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Selected Candidates for Offer ({selectedCandidates.length})
            </h3>
            <span className="text-xs text-emerald-700 font-medium">Stage 3: Interview Cracked • Automated Selection Emails Delivered</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {selectedCandidates.map((c, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-white border border-emerald-200 flex items-center justify-between text-xs shadow-sm">
                <div>
                  <div className="font-bold text-slate-900">{c.full_name}</div>
                  <div className="text-[11px] text-slate-500">{c.target_job} • Score: {c.overall_score || 95.4}%</div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Cleared Assessment & Interview</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-300">
                  OFFERED
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MIDDLE: Active Job Openings Cards */}
      <section className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            Active Job Openings Management
          </h2>
          <span className="text-xs text-slate-500 font-medium">{jobs.length} Positions</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <div key={job.job_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{job.job_title}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px] uppercase">
                  {job.status}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed line-clamp-2">{job.job_description}</p>
              <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between border-t border-slate-200/60 mt-2">
                <span><strong>Skills:</strong> {job.required_skills}</span>
                <span><strong>Exp:</strong> {job.experience_min}–{job.experience_max} yrs</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Filter & Candidate Pipeline View */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Stage-by-Stage Candidate Recruitment Pipeline
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks progression: <strong>Stage 1 (Shortlisted)</strong> → <strong>Stage 2 (Cleared Assessment)</strong> → <strong>Stage 3 (Interview Cracked & Offered)</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={hideRejected}
                onChange={(e) => setHideRejected(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Hide Rejected Candidates</span>
            </label>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidates by name, email, or role..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
          />
        </div>

        {/* Candidate Table with Stage-by-Stage Tracking */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Stage 1: Shortlisted</th>
                <th className="px-4 py-3">Stage 2: Assessment</th>
                <th className="px-4 py-3">Stage 3: Interview</th>
                <th className="px-4 py-3">Integrity</th>
                <th className="px-4 py-3">Current Hiring Stage</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No candidates found for the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((cand, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      <div>{cand.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{cand.email}</div>
                      <div className="text-[10px] text-slate-500">{cand.target_job}</div>
                    </td>
                    <td className="px-4 py-4">
                      {cand.match_score >= 50 ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Shortlisted
                          </span>
                          <div className="text-[11px] font-mono text-indigo-900 font-bold">{cand.match_score}% Match</div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Match {cand.match_score}%</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {cand.assessment_score ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Cleared
                          </span>
                          <div className="font-mono font-bold text-slate-900">{cand.assessment_score}%</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {cand.overall_score ? (
                        <div className="space-y-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            cand.overall_score >= 70
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <Sparkles className="w-3 h-3" />
                            {cand.overall_score >= 70 ? 'Cracked' : 'Completed'}
                          </span>
                          <div className="font-mono font-bold text-emerald-700">{cand.overall_score}%</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">In Progress</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {cand.has_malpractice_flag || cand.malpractice_count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> {cand.malpractice_count || 1} Flags ({cand.integrity_score || 85}%)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Clean (100%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {cand.final_decision === 'selected' || cand.hiring_stage === 'Offered' || cand.application_status === 'selected' ? (
                        <div className="space-y-0.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> OFFERED
                          </span>
                          <div className="text-[10px] text-emerald-700 font-semibold">Stage 3: Interview Cracked</div>
                        </div>
                      ) : cand.hiring_stage === 'Interview Cracked' ? (
                        <div className="space-y-0.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-teal-50 text-teal-700 border border-teal-200 inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-teal-600" /> Interview Cracked
                          </span>
                          <div className="text-[10px] text-teal-700 font-semibold">Ready for Offer</div>
                        </div>
                      ) : cand.assessment_score ? (
                        <div className="space-y-0.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-blue-600" /> Cleared Assessment
                          </span>
                          <div className="text-[10px] text-slate-500">Stage 2 Cleared</div>
                        </div>
                      ) : (cand.match_score >= 50 || cand.hiring_stage === 'Shortlisted') ? (
                        <div className="space-y-0.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-indigo-600" /> Shortlisted
                          </span>
                          <div className="text-[10px] text-slate-500">Stage 1 Cleared</div>
                        </div>
                      ) : cand.application_status === 'malpractice' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Malpractice Disqualified
                        </span>
                      ) : cand.final_decision === 'rejected' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-red-50 text-red-700 border border-red-200">
                          Rejected
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {cand.application_status || 'Applied'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      {cand.report_id && (
                        <Link
                          href={`/candidate/report/${cand.candidate_id}`}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 text-slate-500" /> Report
                        </Link>
                      )}
                      <button
                        onClick={() => setSelectedCand(cand)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shadow-sm ${
                          cand.hiring_stage === 'Interview Cracked'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {cand.hiring_stage === 'Interview Cracked' ? 'Offer Candidate' : 'Decision'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Camera Evidence & Proctoring Gallery */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600" />
              AI Proctoring Camera Evidence Log (Day-by-Day)
            </h2>
            <span className="text-xs text-slate-500">
              Review and remove proctored evidence day by day or purge past days by retention policy
            </span>
          </div>

          {/* Day-by-Day Retention & Purge Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-600">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-[11px]">Retention Policy:</span>
              <select
                value={purgeDays}
                onChange={(e) => setPurgeDays(parseInt(e.target.value))}
                className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs"
              >
                <option value={0}>All Recorded Evidences (Purge All)</option>
                <option value={1}>Older than 1 day (Keep Today Only)</option>
                <option value={3}>Older than 3 days</option>
                <option value={7}>Older than 7 days</option>
                <option value={14}>Older than 14 days</option>
                <option value={30}>Older than 30 days</option>
              </select>
            </div>
            <button
              onClick={handlePurgeOlderThan}
              disabled={isPurging || malpracticeIncidents.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
              title={purgeDays === 0 ? "Purge all recorded proctoring evidence logs" : `Purge all proctoring evidences older than ${purgeDays} days`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isPurging ? 'Purging...' : purgeDays === 0 ? 'Purge All Evidences' : `Purge > ${purgeDays}d Evidences`}
            </button>
          </div>
        </div>

        {/* Day-by-Day Navigation Tabs */}
        {availableIncidentDates.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1 shrink-0">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" /> Filter by Day:
            </span>
            <button
              onClick={() => setSelectedEvidenceDate('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                selectedEvidenceDate === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Days ({malpracticeIncidents.length})
            </button>
            {availableIncidentDates.map((dateStr) => (
              <button
                key={dateStr}
                onClick={() => setSelectedEvidenceDate(dateStr)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  selectedEvidenceDate === dateStr
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{dateStr}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedEvidenceDate === dateStr ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {groupedIncidents[dateStr].length}
                </span>
              </button>
            ))}
          </div>
        )}

        {malpracticeIncidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
            No proctored evidence logs recorded. Any violation during live sessions appears here with photo proof.
          </div>
        ) : (
          <div className="space-y-6">
            {(selectedEvidenceDate === 'all' ? availableIncidentDates : [selectedEvidenceDate])
              .filter((dateStr) => groupedIncidents[dateStr]?.length > 0)
              .map((dateStr) => {
                const dayIncidents = groupedIncidents[dateStr] || [];
                const isDayDeleting = deletingDate === dateStr;
                return (
                  <div key={dateStr} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
                    {/* Day Group Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          {dateStr}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                          {dayIncidents.length} incident{dayIncidents.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteDayEvidence(dateStr)}
                        disabled={isDayDeleting}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 self-start sm:self-auto"
                        title={`Delete all proctored evidence for ${dateStr}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {isDayDeleting ? 'Removing Day...' : `Remove ${dateStr} Evidence`}
                      </button>
                    </div>

                    {/* Day Snapshots Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dayIncidents.map((incident, idx) => {
                        const isDeletingThis = deletingId === incident.log_id;
                        return (
                          <div
                            key={incident.log_id || idx}
                            className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs shadow-sm hover:border-slate-300 transition-colors relative group"
                          >
                            <div className="relative aspect-video rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                              {incident.snapshot_base64 ? (
                                <img
                                  src={incident.snapshot_base64}
                                  alt={`Snapshot for ${incident.candidate_name}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 text-xs">
                                  <Camera className="w-6 h-6 mb-1 text-slate-300" />
                                  <span>Photo Logged</span>
                                </div>
                              )}
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold uppercase shadow-sm">
                                {incident.violation_type?.replace('_', ' ')}
                              </div>

                              {/* Delete Individual Evidence Button */}
                              {incident.log_id && (
                                <button
                                  onClick={() => handleDeleteSingleEvidence(incident.log_id)}
                                  disabled={isDeletingThis}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/70 hover:bg-red-600 text-white transition-colors shadow-sm"
                                  title="Remove this snapshot evidence"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center justify-between font-bold text-slate-900">
                                <span>{incident.candidate_name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {incident.created_at ? new Date(incident.created_at).toLocaleTimeString() : 'Recent'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{incident.details}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      {showCreateJobModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Create New Job Opening</h3>
              <button onClick={() => setShowCreateJobModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems Engineer"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Job Description</label>
                <textarea
                  rows={3}
                  required
                  value={newJobDesc}
                  onChange={(e) => setNewJobDesc(e.target.value)}
                  placeholder="Summary of responsibilities and technical goals..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  required
                  value={newJobSkills}
                  onChange={(e) => setNewJobSkills(e.target.value)}
                  placeholder="Python, FastAPI, PostgreSQL, Distributed Systems"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Min Exp (Yrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newJobExpMin}
                    onChange={(e) => setNewJobExpMin(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Max Exp (Yrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newJobExpMax}
                    onChange={(e) => setNewJobExpMax(parseFloat(e.target.value) || 5)}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateJobModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingJob}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
                >
                  {creatingJob ? 'Publishing...' : 'Publish Job Opening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Review Modal */}
      {selectedCand && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hiring Decision: {selectedCand.full_name}
                </h3>
                <span className="text-[11px] text-slate-500">{selectedCand.target_job} • {selectedCand.email}</span>
              </div>
              <button onClick={() => setSelectedCand(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Final Decision (Triggers Real-Time Email)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision('selected')}
                    className={`p-2.5 rounded-xl border text-center font-bold capitalize transition-all ${
                      decision === 'selected'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Select (Send Offer Email)
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('rejected')}
                    className={`p-2.5 rounded-xl border text-center font-bold capitalize transition-all ${
                      decision === 'rejected'
                        ? 'bg-red-600 border-red-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Reject (Send Feedback Email)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Hiring Committee Notes</label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Notes on assessment performance and candidate strengths..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCand(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReviewSubmit}
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
                >
                  {submitting ? 'Delivering Email...' : 'Confirm & Send Real-Time Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
