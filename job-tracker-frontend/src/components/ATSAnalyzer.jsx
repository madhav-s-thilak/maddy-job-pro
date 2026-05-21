import React, { useState } from 'react';
import { atsAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { Target, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2, FileText, Zap } from 'lucide-react';

const RESUME_KEY = 'maddyJobPro_resume';

const RISK_STYLES = {
  low:    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  medium: { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300',   dot: 'bg-amber-500'   },
  high:   { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300',     dot: 'bg-red-500'     },
};

const RING_CONFIG = [
  { key: 'ats_score',         label: 'ATS Score',        gradient: ['#6366f1', '#818cf8'], track: '#e0e7ff' },
  { key: 'keyword_coverage',  label: 'Keyword Coverage', gradient: ['#10b981', '#34d399'], track: '#d1fae5' },
  { key: 'section_score',     label: 'Section Quality',  gradient: ['#f59e0b', '#fbbf24'], track: '#fef3c7' },
  { key: 'readability_score', label: 'Readability',      gradient: ['#8b5cf6', '#a78bfa'], track: '#ede9fe' },
];

const ScoreRing = ({ score, label, gradientColors, trackColor }) => {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const id = `grad-${label.replace(/\s/g, '')}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="110" height="110" className="-rotate-90">
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          </defs>
          <circle cx="55" cy="55" r={r} fill="none" stroke={trackColor} strokeWidth="10" />
          <circle
            cx="55" cy="55" r={r} fill="none"
            strokeWidth="10" strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round" stroke={`url(#${id})`}
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{score}</span>
          <span className="text-[10px] text-gray-400 font-medium">/100</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-600 text-center">{label}</p>
    </div>
  );
};

const ATSAnalyzer = ({ jobs }) => {
  const [resumeText, setResumeText] = useState(() => localStorage.getItem(RESUME_KEY) || '');
  const [selectedJob, setSelectedJob] = useState('');
  const [jdText, setJdText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showKeywords, setShowKeywords] = useState(false);

  const jobsWithJD = (jobs || []).filter(j => j.job_description);

  const handleJobSelect = (rowId) => {
    setSelectedJob(rowId);
    const job = jobsWithJD.find(j => String(j.row_id) === rowId);
    setJdText(job?.job_description || '');
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) return toast.error('Paste your resume first');
    if (!jdText.trim()) return toast.error('Select a job or paste a JD');
    setLoading(true); setResult(null);
    try {
      localStorage.setItem(RESUME_KEY, resumeText);
      const res = await atsAPI.simulate(resumeText, jdText);
      setResult(res.data);
    } catch { toast.error('ATS simulation failed'); }
    finally { setLoading(false); }
  };

  const riskStyle = result ? (RISK_STYLES[result.formatting_risk] || RISK_STYLES.medium) : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Resume */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3.5">
            <p className="text-white font-bold text-sm">Your Resume</p>
          </div>
          <div className="p-4">
            <textarea
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              placeholder="Paste your resume (plain text or LaTeX)…"
              className="w-full h-44 text-xs border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono bg-gray-50"
            />
          </div>
        </div>

        {/* JD */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3.5 flex items-center justify-between">
            <p className="text-white font-bold text-sm">Job Description</p>
            {jobsWithJD.length > 0 && (
              <select
                value={selectedJob}
                onChange={e => handleJobSelect(e.target.value)}
                className="text-xs bg-white/20 text-white rounded-lg px-2 py-1 border border-white/30 focus:outline-none"
              >
                <option value="" className="text-gray-800">← Pick tracked job</option>
                {jobsWithJD.map(j => (
                  <option key={j.row_id} value={String(j.row_id)} className="text-gray-800">
                    {j.company} — {j.role}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="p-4">
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste job description, or pick a tracked job above…"
              className="w-full h-44 text-xs border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
      >
        {loading
          ? <><Loader2 size={18} className="animate-spin" /> Running ATS simulation…</>
          : <><Target size={18} /> Run ATS Simulation</>
        }
      </button>

      {result && (
        <div className="space-y-5 animate-slide-up">
          {/* Score rings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4">
              <h3 className="font-bold text-white text-sm">ATS Score Breakdown</h3>
              <p className="text-slate-400 text-xs mt-0.5">How an ATS system would evaluate your resume</p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-end justify-around gap-6">
                {RING_CONFIG.map(cfg => (
                  <ScoreRing
                    key={cfg.key}
                    score={result[cfg.key] ?? 0}
                    label={cfg.label}
                    gradientColors={cfg.gradient}
                    trackColor={cfg.track}
                  />
                ))}
              </div>

              {/* Formatting risk + sections */}
              <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-gray-100">
                {riskStyle && (
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${riskStyle.bg} ${riskStyle.text} ${riskStyle.border}`}>
                    <span className={`w-2 h-2 rounded-full ${riskStyle.dot}`} />
                    Formatting: {result.formatting_risk} risk
                  </span>
                )}
                {result.sections_found?.length > 0 && (
                  <span className="text-xs text-gray-500">
                    Detected sections:{' '}
                    <span className="font-semibold text-gray-700">{result.sections_found.join(', ')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Skills grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {result.strong_matches?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3">
                  <p className="text-white font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle size={14} /> Matched Skills
                  </p>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {result.strong_matches.map(s => (
                    <span key={s} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.missing_skills?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3">
                  <p className="text-white font-bold text-xs flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Missing Skills
                  </p>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {result.missing_skills.map(s => (
                    <span key={s} className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-semibold">
                      ✗ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Missing keywords */}
          {result.missing_keywords?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowKeywords(!showKeywords)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-sm font-bold text-gray-900"
              >
                <span className="flex items-center gap-2">
                  <FileText size={15} className="text-indigo-500" />
                  Missing JD Keywords ({result.missing_keywords.length})
                </span>
                {showKeywords ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showKeywords && (
                <div className="px-5 pb-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                  {result.missing_keywords.map(k => (
                    <span key={k} className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-xs font-medium">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-4">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Zap size={16} /> ATS Recommendations
                </h3>
              </div>
              <ul className="p-5 space-y-3">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ATSAnalyzer;
