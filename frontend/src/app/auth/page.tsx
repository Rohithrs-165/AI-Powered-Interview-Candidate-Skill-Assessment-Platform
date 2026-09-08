import Link from 'next/link';
import { User, Users, ArrowRight, BrainCircuit, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function UnifiedAuthPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-sm">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">
          Sign In to Neurova AI
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Please select your portal to continue. Separate specialized workspaces are provided for candidates and HR recruiters.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Candidate Auth Option */}
        <div className="glass-card glass-card-hover p-7 rounded-3xl space-y-5 group flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Candidate Portal</span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">Candidate Sign In & Sign Up</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Submit resume, track application status, take the 55-minute skill assessment, and enter the 18-question adaptive interview.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Link
              href="/candidate/auth"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Candidate Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/candidate/auth?mode=register"
              className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center justify-center transition-all"
            >
              New Candidate? Create Account
            </Link>
          </div>
        </div>

        {/* HR Auth Option */}
        <div className="glass-card glass-card-hover p-7 rounded-3xl space-y-5 group flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">HR & Recruiter Portal</span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">HR Executive Sign In</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Create job vacancies, manage candidate pipeline, inspect assessment and interview reports, and record final hiring decisions.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Link
              href="/hr/auth"
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <span>HR Recruiter Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <div className="py-2 text-center text-[11px] text-slate-400 font-mono">
              Seeded: hr@neurova.ai / admin123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
