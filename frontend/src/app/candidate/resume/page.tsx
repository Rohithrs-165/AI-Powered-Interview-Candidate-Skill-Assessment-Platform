'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UploadCloud, FileText, CheckCircle2, Sparkles, 
  ArrowRight, Briefcase, GraduationCap, Award, Cpu, 
  ChevronRight, Check, AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';

export default function ResumeUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a resume file (PDF or TXT).');
      return;
    }
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.uploadResume(formData);
      if (res.analysis) {
        setAnalysis(res.analysis);
        if (res.candidate_id) {
          localStorage.setItem('candidate_id', res.candidate_id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload and parse resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleStartInterview = (mode: 'text' | 'voice') => {
    router.push(`/candidate/interview?mode=${mode}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 pb-16">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">
          Resume Screening & Skill Profiling
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Upload your resume in PDF or TXT format. Neurova AI extracts your technical skill set, work history, and customizes your adaptive assessment room.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="bg-white p-8 sm:p-10 rounded-3xl border-2 border-dashed border-slate-300 hover:border-indigo-500 transition-all text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
          <UploadCloud className="w-7 h-7" />
        </div>

        <div>
          <input
            type="file"
            id="resume-upload"
            accept=".pdf,.txt,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="resume-upload"
            className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" />
            {file ? file.name : 'Choose Resume (PDF / TXT)'}
          </label>
          <p className="text-xs text-slate-500 mt-2">Supported formats: PDF, TXT, DOCX • Up to 10MB</p>
        </div>

        {file && (
          <div className="pt-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                  Analyzing Skill Profile...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Analyze Profile
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-red-600 pt-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Extracted Profile Display */}
      {analysis && (
        <div className="bg-white p-7 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Verified Candidate Skill Profile
            </h2>
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              Profile Ready
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Summary</h3>
              <p className="text-sm text-slate-700 mt-1 leading-relaxed">{analysis.summary}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified Skill Matrix</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {analysis.skills && analysis.skills.map((skill: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 mb-1">
                  <Briefcase className="w-4 h-4" /> Work Experience Summary
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{analysis.experience_summary}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 mb-1">
                  <GraduationCap className="w-4 h-4" /> Academic Background
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{analysis.education_summary}</p>
              </div>
            </div>
          </div>

          {/* Start Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={() => handleStartInterview('text')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
            >
              Text Assessment Mode
            </button>
            <button
              onClick={() => handleStartInterview('voice')}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Launch Voice Assessment Room
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
