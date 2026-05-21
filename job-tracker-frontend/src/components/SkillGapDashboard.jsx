import React, { useState } from 'react';
import { gapsAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { Zap, BookOpen, TrendingUp, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react';

const RESUME_KEY = 'maddyJobPro_resume';

// Colour cycle for priority skill bars
const BAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-pink-500 to-rose-600',
  'from-sky-400 to-cyan-500',
  'from-orange-400 to-red-500',
  'from-teal-400 to-emerald-500',
];

const WEEK_COLORS = [
  'bg-blue-600', 'bg-violet-600', 'bg-emerald-600',
  'bg-amber-500', 'bg-pink-600', 'bg-sky-500',
];

const WeekItem = ({ week, isLast, colorClass }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-xs font-bold text-white shadow-md shrink-0`}>
        {week.week}
      </div>
      {!isLast && <div className="w-0.5 flex-1 bg-gradient-to-b from-gray-200 to-transparent mt-1" />}
    </div>
    <div className="pb-5 flex-1 min-w-0">
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white mb-1 ${colorClass}`}>
        {week.skill}
      </span>
      <p className="text-sm text-gray-600">{week.focus}</p>
    </div>
  </div>
);

const SkillGapDashboard = ({ currentUser }) => {
  const [resumeText, setResumeText] = useState(() => localStorage.getItem(RESUME_KEY) || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const handleAnalyze = async () => {
    if (!resumeText.trim()) return toast.error('Paste your resume first');
    setLoading(true); setResult(null);
    try {
      localStorage.setItem(RESUME_KEY, resumeText);
      const res = await gapsAPI.analyze(resumeText, currentUser);
      setResult(res.data);
      if (!res.data.total_jobs_analyzed) {
        toast('Add job descriptions to your tracked jobs to enable gap analysis', { icon: '⚠️' });
      }
    } catch { toast.error('Analysis failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Resume input */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Zap size={16} /> Your Resume
          </h3>
          <p className="text-amber-100 text-xs mt-0.5">Paste your full resume to find skill gaps across all tracked jobs</p>
        </div>
        <div className="p-4">
          <textarea
            value={resumeText}
            onChange={e => setResumeText(e.target.value)}
            placeholder="Paste your resume here (plain text or LaTeX)…"
            className="w-full h-36 text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono bg-gray-50"
          />
        </div>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-amber-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
      >
        {loading
          ? <><Loader2 size={18} className="animate-spin" /> Analyzing {currentUser}'s skill gaps…</>
          : <><Zap size={18} /> Analyze Skill Gaps</>
        }
      </button>

      {result && (
        <div className="space-y-5 animate-slide-up">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Jobs Analyzed', value: result.total_jobs_analyzed, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-200' },
              { label: 'Skill Gaps',    value: result.gap_summary?.length || 0, gradient: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-200' },
              { label: 'Your Skills',   value: result.resume_skills?.length || 0, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-200' },
            ].map(s => (
              <div
                key={s.label}
                className={`bg-gradient-to-br ${s.gradient} text-white rounded-2xl p-5 shadow-lg ${s.shadow} text-center`}
              >
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="text-white/80 text-xs mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Insight banner */}
          {result.insight && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl px-5 py-4">
              <p className="text-sm font-medium text-blue-800 leading-relaxed">{result.insight}</p>
            </div>
          )}

          {/* Priority skills */}
          {result.gap_summary?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-5 py-4">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <TrendingUp size={16} /> Priority Skills to Learn
                </h3>
                <p className="text-violet-200 text-xs mt-0.5">Ranked by frequency × market importance</p>
              </div>
              <div className="p-5 space-y-4">
                {result.gap_summary.slice(0, 8).map((gap, i) => (
                  <div key={gap.skill} className="flex items-center gap-4">
                    <span className="w-6 text-xs font-bold text-gray-400 text-right shrink-0">{i + 1}</span>
                    <span className="text-sm font-semibold text-gray-800 w-36 shrink-0">{gap.skill}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${BAR_GRADIENTS[i % BAR_GRADIENTS.length]} transition-all duration-700`}
                        style={{ width: `${gap.pct_of_jobs}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-500 w-16 text-right shrink-0">
                      {gap.pct_of_jobs}% of JDs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning roadmap */}
          {result.learning_roadmap?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowRoadmap(!showRoadmap)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <BookOpen size={16} className="text-emerald-500" />
                  {result.learning_roadmap.length}-week Learning Roadmap
                </span>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${showRoadmap ? 'bg-gray-100' : 'bg-emerald-100'}`}>
                  {showRoadmap ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-emerald-600" />}
                </div>
              </button>
              {showRoadmap && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-4">
                  {result.learning_roadmap.map((week, i) => (
                    <WeekItem
                      key={i}
                      week={week}
                      isLast={i === result.learning_roadmap.length - 1}
                      colorClass={WEEK_COLORS[i % WEEK_COLORS.length]}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Per-job breakdown */}
          {result.job_details?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-sm font-bold text-gray-900"
              >
                Per-job breakdown
                {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showDetails && (
                <div className="px-5 pb-4 border-t border-gray-100 space-y-3 pt-3">
                  {result.job_details.map((j, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm ${
                        j.match_score >= 60 ? 'bg-emerald-500' :
                        j.match_score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}>
                        {j.match_score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{j.role} · {j.company}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {j.missing.map(s => (
                            <span key={s} className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-[10px] font-medium">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resume skills */}
          {result.resume_skills?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} className="text-emerald-500" /> Skills in Your Resume
              </p>
              <div className="flex flex-wrap gap-2">
                {result.resume_skills.map(s => (
                  <span key={s} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillGapDashboard;
