import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jobsAPI } from '../services/api';
import JobCard from './JobCard';
import JobSearch from './JobSearch';
import Analytics from './Analytics';
import FilterBar from './FilterBar';
import BestMatchPanel from './BestMatchPanel';
import Sidebar from './Sidebar';
import ATSAnalyzer from './ATSAnalyzer';
import SkillGapDashboard from './SkillGapDashboard';
import ResumeCompiler from './ResumeCompiler';
import PortfolioCritic from './PortfolioCritic';
import { toast } from 'react-hot-toast';
import { Plus, RefreshCw, Search, BarChart3, Sparkles, ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// User switcher — top-right corner
// Madhav is always visible. Veena & Vandhana appear only in the dropdown.
// ---------------------------------------------------------------------------
const UserSwitcher = ({ currentUser, onUserChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const onOtherUser = currentUser !== 'Madhav' ? currentUser : null;

  return (
    <div className="flex items-center gap-2" ref={ref}>
      {/* Madhav — always visible */}
      <button
        onClick={() => { onUserChange('Madhav'); setOpen(false); }}
        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          currentUser === 'Madhav'
            ? 'bg-primary-600 text-white'
            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
        }`}
      >
        Madhav
      </button>

      {/* "Other" button — reveals Veena & Vandhana in a dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            onOtherUser
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {onOtherUser || 'Other'}
          <ChevronDown
            size={13}
            className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200 rounded-xl overflow-hidden py-1"
               style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}>
            {['Veena', 'Vandhana'].map(u => (
              <button
                key={u}
                onClick={() => { onUserChange(u); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors ${
                  currentUser === u
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentUser === u ? 'bg-primary-500' : 'bg-slate-300'}`} />
                {u}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page header for each view
// ---------------------------------------------------------------------------
const PAGE_META = {
  jobs:      { title: 'Job Tracker',       desc: 'Track and manage your applications' },
  analytics: { title: 'Analytics',          desc: 'Application funnel and conversion rates' },
  bestmatch: { title: 'AI Best Match',      desc: 'Rank your jobs by resume similarity' },
  ats:       { title: 'ATS Simulator',      desc: 'See how an ATS parser scores your resume' },
  gaps:      { title: 'Skill Gap Analysis', desc: 'Identify missing skills across your target roles' },
  compiler:  { title: 'Resume Compiler',    desc: 'Generate a role-specific resume with AI' },
  portfolio: { title: 'Portfolio Critic',   desc: 'Recruiter-style analysis of your GitHub profile' },
  extension: { title: 'Browser Extension', desc: 'Save jobs from any site with one click' },
};

// ---------------------------------------------------------------------------
// Extension onboarding (simple, no dark theme)
// ---------------------------------------------------------------------------
const ExtensionView = () => (
  <div className="max-w-lg mx-auto py-10 space-y-6">
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">🔌</span>
      </div>
      <h3 className="text-base font-semibold text-slate-900">Browser Extension Coming Soon</h3>
      <p className="text-sm text-slate-500 mt-1">
        Save jobs from LinkedIn, Wellfound, and Greenhouse with one click. The backend is ready.
      </p>
    </div>

    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">API Endpoint</p>
      <code className="block text-sm text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-4 py-2.5 font-mono">
        POST /extension/ingest
      </code>
      <p className="text-xs text-slate-500">
        Accepts company, role, job_description, jd_link, source_site. Auto-deduplicates.
      </p>
    </div>

    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Checklist</p>
      <ul className="space-y-2.5">
        {[
          ['Backend ingestion API', true],
          ['Duplicate detection', true],
          ['Chrome extension manifest', false],
          ['LinkedIn content script', false],
          ['Wellfound / Greenhouse parser', false],
        ].map(([label, done]) => (
          <li key={label} className="flex items-center gap-2.5 text-sm">
            <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${done ? 'bg-green-500' : 'bg-slate-200'}`}>
              {done && <span className="text-white text-[10px] font-bold">✓</span>}
            </span>
            <span className={done ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Jobs view (main page)
// ---------------------------------------------------------------------------
const JobsView = ({
  jobs, loading, filters, onFilterChange,
  onJobUpdate, onJobDelete, onJobAdded,
  showJobSearch, setShowJobSearch, currentUser, fetchJobs,
}) => (
  <div>
    {/* Action bar */}
    <div className="flex items-center gap-3 flex-wrap mb-6">
      <button
        onClick={() => setShowJobSearch(!showJobSearch)}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm font-medium"
      >
        <Plus size={18} /> Look for New Jobs
      </button>
      <button
        onClick={() => setShowJobSearch(!showJobSearch)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium"
      >
        <Search size={18} /> Search Jobs
      </button>
      <button
        onClick={fetchJobs}
        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
      >
        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
      </button>
    </div>

    {/* Job search panel */}
    {showJobSearch && (
      <div className="mb-5 animate-slide-up">
        <JobSearch
          currentUser={currentUser}
          onJobAdded={() => { onJobAdded(); setShowJobSearch(false); }}
          onClose={() => setShowJobSearch(false)}
        />
      </div>
    )}

    {/* Filter bar */}
    <div className="mb-4">
      <FilterBar filters={filters} onFilterChange={onFilterChange} />
    </div>

    {/* Job count */}
    <div className="mb-4">
      <p className="text-gray-600">
        Showing <span className="font-semibold text-gray-900">{jobs.length}</span> job{jobs.length !== 1 ? 's' : ''}
        {filters.status && ` in status: ${filters.status}`}
        {filters.search && ` matching: "${filters.search}"`}
      </p>
    </div>

    {/* Jobs grid */}
    {loading ? (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    ) : jobs.length === 0 ? (
      <div className="text-center py-20">
        <div className="text-gray-400 mb-4">
          <BarChart3 size={64} className="mx-auto" />
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">No jobs found</h3>
        <p className="text-gray-600">
          {filters.status || filters.search
            ? 'Try adjusting your filters'
            : 'Click "Look for New Jobs" to get started'}
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {jobs.map(job => (
          <JobCard
            key={job.row_id}
            job={job}
            onUpdate={onJobUpdate}
            onDelete={() => onJobDelete(job.row_id)}
          />
        ))}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------
const Dashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState('Madhav');
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [activeView, setActiveView] = useState('jobs');
  const [showJobSearch, setShowJobSearch] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobsAPI.getAll(currentUser, filters.status || null, filters.search || null);
      setJobs(res.data);
    } catch {
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [currentUser, filters]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleJobDelete = async (rowId) => {
    if (!window.confirm('Delete this job?')) return;
    try {
      await jobsAPI.delete(rowId);
      toast.success('Job deleted');
      fetchJobs();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleUserChange = (user) => {
    setCurrentUser(user);
    setActiveView('jobs');
    setShowJobSearch(false);
  };

  const meta = PAGE_META[activeView] || PAGE_META.jobs;

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={(v) => { setActiveView(v); setShowJobSearch(false); }}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page top bar */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeView === 'jobs' ? (
                  <>
                    Job Tracker{' '}
                    <span
                      style={{
                        background: 'linear-gradient(90deg, #6366f1, #3b82f6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Pro
                    </span>
                  </>
                ) : meta.title}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{meta.desc}</p>
            </div>

            {/* Right side: quick nav + user switcher */}
            <div className="flex items-center gap-3 shrink-0">
              {activeView === 'jobs' && (
                <>
                  <button onClick={() => setActiveView('bestmatch')} className="btn-ghost text-xs">
                    <Sparkles size={13} className="text-violet-500" /> AI Match
                  </button>
                  <button onClick={() => setActiveView('analytics')} className="btn-ghost text-xs">
                    <BarChart3 size={13} className="text-primary-500" /> Analytics
                  </button>
                  <div className="w-px h-5 bg-slate-200" />
                </>
              )}
              <UserSwitcher currentUser={currentUser} onUserChange={handleUserChange} />
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {activeView === 'jobs' && (
              <JobsView
                jobs={jobs}
                loading={loading}
                filters={filters}
                onFilterChange={setFilters}
                onJobUpdate={fetchJobs}
                onJobDelete={handleJobDelete}
                onJobAdded={fetchJobs}
                showJobSearch={showJobSearch}
                setShowJobSearch={setShowJobSearch}
                currentUser={currentUser}
                fetchJobs={fetchJobs}
              />
            )}

            {activeView === 'analytics' && (
              <div className="animate-fade-in">
                <Analytics currentUser={currentUser} />
              </div>
            )}

            {activeView === 'bestmatch' && (
              <div className="animate-fade-in">
                <BestMatchPanel
                  currentUser={currentUser}
                  onClose={() => setActiveView('jobs')}
                />
              </div>
            )}

            {activeView === 'ats' && (
              <div className="animate-fade-in">
                <ATSAnalyzer jobs={jobs} />
              </div>
            )}

            {activeView === 'gaps' && (
              <div className="animate-fade-in">
                <SkillGapDashboard currentUser={currentUser} />
              </div>
            )}

            {activeView === 'compiler' && (
              <div className="animate-fade-in">
                <ResumeCompiler jobs={jobs} />
              </div>
            )}

            {activeView === 'portfolio' && (
              <div className="animate-fade-in">
                <PortfolioCritic />
              </div>
            )}

            {activeView === 'extension' && (
              <div className="animate-fade-in">
                <ExtensionView />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
