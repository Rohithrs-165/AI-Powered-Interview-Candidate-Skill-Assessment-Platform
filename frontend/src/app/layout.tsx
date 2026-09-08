import './globals.css';
import Link from 'next/link';
import { BrainCircuit, ChevronRight, User, Users, LogIn, UserPlus } from 'lucide-react';

export const metadata = {
  title: 'Neurova AI — Two-Portal Enterprise Technical Recruitment Platform',
  description: 'A professional, two-portal recruitment product built with Next.js, FastAPI, PostgreSQL, and Gemini AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-serif selection:bg-indigo-500/20">
        {/* Navigation Bar — Two Portals + Clear Auth Links */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:bg-indigo-700 transition-colors">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-xl tracking-tight text-slate-900">
                  Neurova<span className="text-indigo-600 font-extrabold">.ai</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
                  Enterprise
                </span>
              </div>
            </Link>

            {/* Navigation: Two Portals Only */}
            <nav className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700">
              <Link 
                href="/candidate" 
                className="px-3 py-2 rounded-xl hover:text-indigo-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <User className="w-4 h-4 text-indigo-600" />
                Candidate Portal
              </Link>
              <Link 
                href="/hr/dashboard" 
                className="px-3 py-2 rounded-xl hover:text-indigo-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <Users className="w-4 h-4 text-slate-600" />
                HR Portal
              </Link>
            </nav>

            {/* Action Buttons: Sign In / Sign Up */}
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/candidate/auth"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Candidate Sign Up</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Clean Footer */}
        <footer className="border-t border-slate-200 bg-white py-8 mt-12 text-sm text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                N
              </div>
              <span className="font-semibold text-slate-800">Neurova AI</span>
              <span>— Two-Portal Enterprise Technical Recruitment Platform</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <Link href="/candidate/auth" className="hover:text-indigo-600">Candidate Login</Link>
              <span>•</span>
              <Link href="/hr/auth" className="hover:text-indigo-600">HR Login</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
