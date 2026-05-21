import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Jobs API
export const jobsAPI = {
  getAll: (user = null, status = null, search = null) => {
    const params = {};
    if (user) params.user = user;
    if (status) params.status = status;
    if (search) params.search = search;
    return api.get('/jobs/', { params });
  },

  create: (jobData) => api.post('/jobs/', jobData),

  update: (rowId, jobData) => api.put(`/jobs/${rowId}`, jobData),

  delete: (rowId) => api.delete(`/jobs/${rowId}`),

  extractFromUrl: (jobUrl, user) => 
    api.post('/jobs/extract', { job_url: jobUrl, user }),

  search: (query, location) => 
    api.get('/jobs/search', { params: { query, location } }),

  getAnalytics: (user = null) => {
    const params = user ? { user } : {};
    return api.get('/jobs/analytics', { params });
  },
};

// Applications API
export const applicationsAPI = {
  markAsApplied: (rowId, resumeVersion = '') => 
    api.post('/applications/mark-applied', { 
      row_id: rowId, 
      resume_version: resumeVersion 
    }),

  updateNotes: (rowId, notes) => 
    api.put('/applications/notes', { row_id: rowId, notes }),
};

// Resume API
export const resumeAPI = {
  optimize: (jobDescription, currentResume) =>
    api.post('/resume/optimize', {
      job_description: jobDescription,
      current_resume: currentResume
    }),

  generateEmail: (jobDescription, resumeContent, applicantName, rowId = null, resumeFilename = null) =>
    api.post('/resume/generate-email', {
      job_description: jobDescription,
      resume_content: resumeContent,
      applicant_name: applicantName,
      row_id: rowId,
      resume_filename: resumeFilename
    }),
};

// Intelligence API (semantic scoring + best-match ranking)
export const intelligenceAPI = {
  // Score a single resume against a job description
  score: (resumeText, jobDescription, jobCompany = '', jobRole = '') =>
    api.post('/intelligence/score', {
      resume_text: resumeText,
      job_description: jobDescription,
      job_company: jobCompany,
      job_role: jobRole,
    }),

  // Rank all tracked jobs for a user by resume similarity
  rankJobs: (resumeText, user = null, topN = 20) =>
    api.post('/intelligence/rank-jobs', {
      resume_text: resumeText,
      user,
      top_n: topN,
    }),
};

// ATS Simulation API
export const atsAPI = {
  simulate: (resumeText, jobDescription, jobRole = '', jobCompany = '') =>
    api.post('/ats/simulate', {
      resume_text: resumeText,
      job_description: jobDescription,
      job_role: jobRole,
      job_company: jobCompany,
    }),
};

// Skill Gap Analysis API
export const gapsAPI = {
  analyze: (resumeText, user = null) =>
    api.post('/gaps/analyze', { resume_text: resumeText, user }),
};

// Resume Compiler API
export const compilerAPI = {
  compile: (masterResume, jobDescription, jobRole = '', jobCompany = '') =>
    api.post('/compiler/compile', {
      master_resume: masterResume,
      job_description: jobDescription,
      job_role: jobRole,
      job_company: jobCompany,
    }),
};

// Portfolio Critic API
export const portfolioAPI = {
  analyze: (githubUrl, portfolioUrl = '') =>
    api.post('/portfolio/analyze', {
      github_url: githubUrl,
      portfolio_url: portfolioUrl,
    }),
};

// Browser Extension API
export const extensionAPI = {
  ingest: (payload) => api.post('/extension/ingest', payload),
  ping:   ()        => api.get('/extension/ping'),
};

export default api;
