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
};

export default api;
