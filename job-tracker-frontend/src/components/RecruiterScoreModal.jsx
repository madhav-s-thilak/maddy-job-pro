import React, { useState, useEffect } from 'react';
import { intelligenceAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  X, Brain, TrendingUp, AlertTriangle, CheckCircle,
  Lightbulb, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';

const RESUME_KEY = 'maddyJobPro_resume';

const GRADE_STYLES = {
  A: { ring: '#10b981', bg: 'bg-green-50 border-green-200',   badge: 'bg-green-100 text-green-800 border-green-300',   label: 'Excellent' },
  B: { ring: '#3b82f6', bg: 'bg-blue-50 border-blue-200',     badge: 'bg-blue-100 text-blue-800 border-blue-300',      label: 'Good' },
  C: { ring: '#f59e0b', bg: 'bg-amber-50 border-amber-200',   badge: 'bg-amber-100 text-amber-800 border-amber-300',   label: 'Fair' },
  D: { ring: '#f97316', bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-800 border-orange-300',label: 'Weak' },
  F: { ring: '#ef4444', bg: 'bg-red-50 border-red-200',       badge: 'bg-red-100 text-red-800 border-red-300',         label: 'Poor' },
};

const ScoreBar = ({ label, value, color }) => (
  <div>
    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
      <span>{label}</span>
      <span className="font-semibold text-slate-700">{value}%</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  </div>
);

const ScoreRing = ({ score, grade }) => {
  const g = GRADE_STYLES[grade] || GRADE_STYLES.F;
  const r = 44; const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width="110" height="110" className="-rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <circle cx="55" cy="55" r={r} fill="none" strokeWidth="9"
          strokeDasharray={`${(score / 100) * circ} ${circ}`}
          strokeLinecap="round" stroke={g.ring}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-slate-900">{score}</p>
        <p className="text-xs text-slate-400">/ 100</p>
      </div>
    </div>
  );
};

const RecruiterScoreModal = ({ job, onClose }) => {
  const [resumeText, setResumeText] = useState(() => localStorage.getItem(RESUME_KEY) || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(!localStorage.getItem(RESUME_KEY));
  const [showAllSkills, setShowAllSkills] = useState(false);

  useEffect(() => {
    if (resumeText && job.job_description) handleScore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScore = async () => {
    if (!resumeText.trim()) { toast.error('Paste your resume first'); setShowInput(true); return; }
    if (!job.job_description) { toast.error('This job has no description'); return; }
    setLoading(true); setResult(null);
    try {
      localStorage.setItem(RESUME_KEY, resumeText);
      const res = await intelligenceAPI.score(resumeText, job.job_description, job.company, job.role);
      setResult(res.data);
    } catch { toast.error('Scoring failed — try again'); }
    finally { setLoading(false); }
  };

  const g = result ? (GRADE_STYLES[result.grade] || GRADE_STYLES.F) : null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Brain size={16} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">AI Recruiter Score</p>
              <p className="text-xs text-slate-500">{job.role} · {job.company}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Resume input */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowInput(!showInput)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-medium text-slate-700"
            >
              <span>{resumeText ? 'Your Resume (saved)' : 'Paste Your Resume'}</span>
              {showInput ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showInput && (
              <div className="p-3">
                <textarea
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                  placeholder="Paste your resume (plain text or LaTeX)…"
                  className="input h-32 resize-none font-mono text-xs"
                />
                <p className="text-xs text-slate-400 mt-1.5">Saved in your browser for future scoring.</p>
              </div>
            )}
          </div>

          <button
            onClick={handleScore}
            disabled={loading || !job.job_description}
            className="btn-primary w-full py-2.5 bg-violet-600 hover:bg-violet-700"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Analyzing…</>
              : <><Brain size={15} /> {result ? 'Re-score Resume' : 'Score Resume'}</>
            }
          </button>

          {!job.job_description && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              This job has no description. Add one to enable scoring.
            </p>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 animate-slide-up">
              {/* Composite score */}
              <div className={`rounded-xl p-4 border ${g.bg} flex flex-col sm:flex-row items-center gap-4`}>
                <ScoreRing score={result.match_score} grade={result.grade} />
                <div>
                  <span className={`badge border text-xs font-semibold ${g.badge}`}>
                    Grade {result.grade} — {g.label}
                  </span>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{result.summary}</p>
                </div>
              </div>

              {/* Score breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-primary-500" /> Score Breakdown
                </p>
                <ScoreBar label="Semantic Similarity" value={result.semantic_score} color="bg-violet-500" />
                <ScoreBar label="Skill Overlap"       value={result.skill_score}    color="bg-primary-500" />
                <ScoreBar label="Keyword Density"     value={result.keyword_score}  color="bg-teal-500" />
              </div>

              {/* Strong matches */}
              {result.strong_matches?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5 mb-2">
                    <CheckCircle size={13} /> Matched Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(showAllSkills ? result.strong_matches : result.strong_matches.slice(0, 8)).map(s => (
                      <span key={s} className="badge bg-green-50 text-green-700 border border-green-200">{s}</span>
                    ))}
                    {result.strong_matches.length > 8 && (
                      <button onClick={() => setShowAllSkills(!showAllSkills)} className="text-xs text-slate-400 hover:text-slate-600 underline">
                        {showAllSkills ? 'less' : `+${result.strong_matches.length - 8} more`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Missing skills */}
              {result.missing_skills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-700 flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={13} /> Skill Gaps
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missing_skills.map(s => (
                      <span key={s} className="badge bg-orange-50 text-orange-700 border border-orange-200">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-3">
                    <Lightbulb size={13} /> Recruiter Recommendations
                  </p>
                  <ul className="space-y-2">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                        <span className="text-amber-600 mt-0.5 shrink-0 font-bold">→</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecruiterScoreModal;
