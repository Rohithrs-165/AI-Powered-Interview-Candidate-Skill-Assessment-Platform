'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, Lock, Mail, Sparkles, CheckCircle2, 
  ArrowRight, AlertCircle, ShieldCheck, KeyRound
} from 'lucide-react';
import { api } from '@/lib/api';

export default function HRAuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('hr@neurova.ai');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.login({ email, password });
      if (res.access_token) {
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('role', 'hr');
      }
      router.push('/hr/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid HR credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = () => {
    setEmail('hr@neurova.ai');
    setPassword('admin123');
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white mx-auto shadow-sm">
          <Users className="w-6 h-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          Recruiter & Committee Portal
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          HR Executive Sign In
        </h1>
        <p className="text-xs text-slate-500">
          Access candidate pipelines, assessment reviews, proctoring evidence logs, and issue employment offers.
        </p>
      </div>

      <div className="glass-card p-7 sm:p-8 rounded-3xl space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">HR Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hr@neurova.ai"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white text-xs"
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
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Sparkles className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Sign In to HR Workspace
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Auto-Fill */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Seeded HR Account:</span>
          <button
            type="button"
            onClick={fillDemoCreds}
            className="font-mono text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            Auto-fill (hr@neurova.ai / admin123)
          </button>
        </div>

        <div className="text-center pt-1">
          <Link
            href="/candidate/auth"
            className="text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors"
          >
            Are you a candidate? Switch to <strong>Candidate Sign In / Sign Up</strong>
          </Link>
        </div>
      </div>
    </div>
  );
}
