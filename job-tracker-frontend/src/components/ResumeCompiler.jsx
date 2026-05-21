import React, { useState } from 'react';
import { compilerAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  Brain, TrendingUp, Copy, Check, Loader2,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, Minus
} from 'lucide-react';

const RESUME_KEY = 'maddyJobPro_resume';

const Delta = ({ value, label }) => {
  const isPos = value > 0;
  const isNeg = value < 0;
  return (
    <div className="text-center">
      <div className={`flex items-center justify-center gap-0.5 text-xl font-bold
        ${isPos ? 'text-green-600' : isNeg ? 'text-red-600' : 'text-slate-400'}`}>
        {isPos ? <ArrowUp size={16} /> : isNeg ? <ArrowDown size={16} /> : <Minus size={16} />}
        {isPos ? '+' : ''}{value}
      </div>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
};

const ScoreBox = ({ label, value, highlight }) => (
  <div className="text-center">
    <p className={`text-2xl font-bold ${highlight ? 'text-slate-900' : 'text-slate-400'}`}>{value ?? '–'}</p>
    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
  </div>
);

const ResumeCompiler = ({ jobs }) => {
  const [masterResume, setMasterResume] = useState(() => localStorage.getItem(RESUME_KEY) || '');
  const [selectedJob, setSelectedJob] = useState('');
  const [jdText, setJdText] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showChanges, setShowChanges] = useState(true);

  const jobsWithJD = (jobs || []).filter(j => j.job_description);

  const handleJobSelect = (rowId) => {
    setSelectedJob(rowId);
    const job = jobsWithJD.find(j => String(j.row_id) === rowId);
    if (job) { setJdText(job.job_description); setJobRole(job.role); setJobCompany(job.company); }
  };

  const handleCompile = async () => {
    if (!masterResume.trim()) return toast.error('Paste your master resume first');
    if (!jdText.trim()) return toast.error('Select a job or paste a job description');
    setLoading(true); setResult(null);
    try {
      localStorage.setItem(RESUME_KEY, masterResume);
      const res = await compilerAPI.compile(masterResume, jdText, jobRole, jobCompany);
      setResult(res.data);
      toast.success('Resume compiled successfully');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Compilation failed');
    } finally { setLoading(false); }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.compiled_resume);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm text-amber-800">
          <strong>Important:</strong> The compiler only rewrites and reprioritises existing content.
          It will never add companies, roles, or achievements that are not in your master resume.
        </p>
      </div>

      {/* Target job */}
      {jobsWithJD.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Target Job (from tracker)</label>
          <select value={selectedJob} onChange={e => handleJobSelect(e.target.value)} className="select w-full">
            <option value="">Select a tracked job to auto-fill…</option>
            {jobsWithJD.map(j => (
              <option key={j.row_id} value={String(j.row_id)}>{j.company} — {j.role}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Master Resume</label>
          <textarea
            value={masterResume}
            onChange={e => setMasterResume(e.target.value)}
            placeholder="Paste your full resume (plain text or LaTeX)…"
            className="input h-56 resize-none font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Job Description</label>
          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder="Paste job description, or pick from tracker above…"
            className="input h-36 resize-none text-xs"
          />
          <div className="flex gap-2">
            <input value={jobRole} onChange={e => setJobRole(e.target.value)} placeholder="Role title" className="input flex-1" />
            <input value={jobCompany} onChange={e => setJobCompany(e.target.value)} placeholder="Company" className="input flex-1" />
          </div>
        </div>
      </div>

      <button onClick={handleCompile} disabled={loading} className="btn-primary w-full py-2.5">
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Compiling with Groq — ~15 seconds…</>
          : <><Brain size={15} /> Compile Optimised Resume</>
        }
      </button>

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Score impact */}
          <div className="bg-white border border-slate-200 rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Score Impact</p>
            <div className="flex items-center justify-around flex-wrap gap-4">
              <ScoreBox label="Original ATS"  value={result.original_score?.ats_score}  highlight={false} />
              <Delta value={result.score_delta}  label="ATS Δ" />
              <ScoreBox label="Compiled ATS"  value={result.compiled_score?.ats_score}  highlight />
              <div className="w-px h-8 bg-slate-200 hidden sm:block" />
              <Delta value={result.match_delta} label="Match Δ" />
              <ScoreBox label="Grade" value={result.compiled_score?.grade} highlight />
            </div>
          </div>

          {/* Changes */}
          {result.changes_made?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <button
                onClick={() => setShowChanges(!showChanges)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-900"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp size={15} className="text-primary-600" /> Changes Made
                </span>
                {showChanges ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showChanges && (
                <ul className="px-5 pb-4 space-y-2 border-t border-slate-100 pt-3">
                  {result.changes_made.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-primary-500 font-bold shrink-0 mt-0.5">→</span> {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Compiled resume output */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-900">Compiled Resume</p>
              <button onClick={handleCopy} className="btn-secondary text-xs py-1.5 px-3">
                {copied ? <><Check size={13} className="text-green-600" /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
            <pre className="p-5 text-xs text-slate-700 font-mono overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed bg-slate-50">
              {result.compiled_resume}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeCompiler;
