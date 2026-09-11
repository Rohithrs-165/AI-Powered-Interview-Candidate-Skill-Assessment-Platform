function getApiBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
  url = url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  if (!url.endsWith('/api/v1')) {
    url = url.replace(/\/+$/, '') + '/api/v1';
  }
  return url;
}

const API_BASE_URL = getApiBaseUrl();

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Network request failed' }));
    throw new Error(err.detail || `Error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  // Auth & Profile
  register: (data: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  verifyOtp: (data: any) => apiRequest('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }),
  resendOtp: (data: { email: string }) => apiRequest('/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) }),

  // Resume
  uploadResume: async (formData: FormData) => {
    const res = await fetch(`${API_BASE_URL}/resume/upload`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  // Job Openings
  getJobs: (statusFilter?: string) => apiRequest(`/jobs${statusFilter ? `?status_filter=${statusFilter}` : ''}`),
  createJob: (data: any) => apiRequest('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  getJob: (jobId: string) => apiRequest(`/jobs/${jobId}`),
  deleteJob: (jobId: string) => apiRequest(`/jobs/${jobId}`, { method: 'DELETE' }),

  // Applications & AI Matching
  applyJob: (data: { candidate_id: string; job_id: string }) =>
    apiRequest('/applications/apply', { method: 'POST', body: JSON.stringify(data) }),
  getMyApplications: (candidateId: string) => apiRequest(`/applications/my-applications/${candidateId}`),
  getJobApplications: (jobId: string) => apiRequest(`/applications/job/${jobId}`),
  deleteApplication: (applicationId: string) => apiRequest(`/applications/${applicationId}`, { method: 'DELETE' }),

  // 55-Minute Assessments
  startAssessment: (applicationId?: string, candidateId?: string) =>
    apiRequest('/assessments/start', {
      method: 'POST',
      body: JSON.stringify({
        ...(applicationId ? { application_id: applicationId } : {}),
        ...(candidateId ? { candidate_id: candidateId } : {}),
      }),
    }),
  getAssessmentStatus: (sessionId: string) => apiRequest(`/assessments/${sessionId}`),
  submitAssessment: (sessionId: string, answers: any) =>
    apiRequest(`/assessments/${sessionId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
  terminateAssessmentMalpractice: (sessionId: string, data?: any) =>
    apiRequest(`/assessments/${sessionId}/terminate-malpractice`, {
      method: 'POST',
      body: JSON.stringify(data || { violation_count: 4, reason: 'Exceeded maximum allowed proctoring violations (>3 attempts)' })
    }),

  // 18-Question Adaptive Interviews
  startInterview: (data: any) => apiRequest('/interviews/start', { method: 'POST', body: JSON.stringify(data) }),
  submitAnswer: (interviewId: string, data: any) =>
    apiRequest(`/interviews/${interviewId}/submit-answer`, { method: 'POST', body: JSON.stringify(data) }),
  getInterviewSummary: (interviewId: string) => apiRequest(`/interviews/${interviewId}/summary`),

  // Proctoring & Malpractice
  logMalpractice: (interviewId: string, data: any) =>
    apiRequest(`/interviews/${interviewId}/malpractice-log`, { method: 'POST', body: JSON.stringify(data) }),
  terminateInterviewMalpractice: (interviewId: string, data?: any) =>
    apiRequest(`/interviews/${interviewId}/terminate-malpractice`, { method: 'POST', body: JSON.stringify(data || {}) }),
  getMalpracticeLogs: (interviewId: string) => apiRequest(`/interviews/${interviewId}/malpractice-logs`),

  // Reports
  getReport: (reportId: string) => apiRequest(`/reports/${reportId}`),

  // HR Portal
  getHRCandidates: (hideRejected: boolean = true, statusFilter?: string) => {
    let query = `?hide_rejected=${hideRejected}`;
    if (statusFilter) query += `&status_filter=${statusFilter}`;
    return apiRequest(`/hr/candidates${query}`);
  },
  getHRStats: () => apiRequest('/hr/dashboard-stats'),
  getAllMalpracticeIncidents: () => apiRequest('/hr/malpractice-incidents'),
  getMalpracticeIncidentsByDay: () => apiRequest('/hr/malpractice-incidents/by-day'),
  deleteMalpracticeByDay: (dateStr: string) =>
    apiRequest(`/hr/malpractice-incidents/day/${dateStr}`, { method: 'DELETE' }),
  purgeMalpracticeOlderThan: (days: number) =>
    apiRequest(`/hr/malpractice-incidents/older-than/${days}`, { method: 'DELETE' }),
  deleteMalpracticeLog: (logId: string) =>
    apiRequest(`/hr/malpractice-incidents/${logId}`, { method: 'DELETE' }),
  submitHRReview: (reportId: string, data: any) =>
    apiRequest(`/hr/review/${reportId}`, { method: 'POST', body: JSON.stringify(data) }),

  // ML Metrics
  getMLMetrics: () => apiRequest('/ml/metrics'),
};
