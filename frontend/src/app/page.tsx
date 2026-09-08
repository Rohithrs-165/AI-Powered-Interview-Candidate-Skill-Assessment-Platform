import Link from 'next/link';
import { 
  Sparkles, ShieldCheck, Database, Mic, Cpu, ArrowRight, 
  CheckCircle2, BarChart3, Users, Zap, Award, FileText, 
  ChevronRight, Laptop, User, Layers, Clock, Mail
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-indigo-200/80 text-indigo-700 text-xs font-semibold shadow-sm">
          <Zap className="w-3.5 h-3.5 text-indigo-600" />
          Two-Portal Product Architecture: Candidate Portal & HR Portal
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15] drop-shadow-sm">
          AI-Powered Interview & <br className="hidden sm:inline" />
          <span className="text-indigo-600">Candidate Skill Assessment Platform</span>
        </h1>

        <p className="text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed font-medium">
          A cohesive recruitment product built with Next.js, Tailwind CSS, FastAPI, PostgreSQL, and Gemini AI. Delivering resume matching, a 55-minute multi-section assessment, and an 18-question adaptive interview.
        </p>

        {/* Portals Entrance Cards — Clear Auth Gateways */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto pt-4 text-left">
          {/* Candidate Portal Card */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200 hover:border-indigo-500 transition-all shadow-sm space-y-5 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
                <User className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Candidate Portal</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">For Candidates</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Sign up, upload resume, get AI matched to job openings, take the 55-minute skill assessment and 18-question adaptive interview.
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
                New Candidate? Create Account (Sign Up)
              </Link>
            </div>
          </div>

          {/* HR Portal Card */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200 hover:border-slate-800 transition-all shadow-sm space-y-5 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-white shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Recruiter Workspace</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">For HR & Committees</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Create job vacancies, manage candidate pipeline, inspect assessment scorecards & proctoring camera logs, and make final hiring decisions.
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
      </section>

      {/* Two-Portal Core Product Flow Comparison — Frosted Glass Container */}
      <section className="glass-card rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Cohesive Recruitment Journey</h2>
          <p className="text-xs text-slate-600 font-medium">
            End-to-end integration connecting job requirements, candidate profiles, assessments, and decision notifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* Candidate Journey */}
          <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-indigo-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" /> Candidate Journey
            </h3>
            <ol className="space-y-3 text-xs text-slate-700">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
                <span><strong>Sign Up & Profile:</strong> Experience choice, education, certifications, and resume upload.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
                <span><strong>AI Matching & Shortlist:</strong> Gemini matches resume to job requirements ($\ge 50\%$ unlocks assessment).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
                <span><strong>55-Minute Assessment:</strong> 10 Aptitude (15m) + 5 Verbal (5m) + 5 MCQs (5m) + 1 Coding Problem (30m).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">4</span>
                <span><strong>18-Question Interview:</strong> 3 assessment-based + 5 JD-based + 10 adaptive skill questions with camera proctoring.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">5</span>
                <span><strong>Final Outcome:</strong> View status and receive immediate selection or feedback email.</span>
              </li>
            </ol>
          </div>

          {/* HR Journey */}
          <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-700" /> HR Journey
            </h3>
            <ol className="space-y-3 text-xs text-slate-700">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
                <span><strong>HR Sign In:</strong> Secure role-based credentials.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
                <span><strong>Create Job Openings:</strong> Title, description, required skills, and experience parameters.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
                <span><strong>Candidate Pipeline:</strong> Filter active applicants across applied, assessment, and interview stages.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">4</span>
                <span><strong>Report Inspection:</strong> Review assessment scores, question transcripts, ML metrics, and camera proctoring snapshots.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">5</span>
                <span><strong>Final Decision:</strong> Choose Select or Reject with comments; triggers automated real-time email.</span>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
