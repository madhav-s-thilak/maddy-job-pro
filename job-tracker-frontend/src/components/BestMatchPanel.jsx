import React, { useState } from 'react';
import { intelligenceAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  X, Sparkles, Brain, CheckCircle, AlertTriangle,
  MapPin, DollarSign, Loader2, ChevronDown, ChevronUp,
  ExternalLink, TrendingUp
} from 'lucide-react';

const RESUME_STORAGE_KEY = 'maddyJobPro_resume';

// ---------------------------------------------------------------------------
// Grade badge colours
// ---------------------------------------------------------------------------
const GRADE_BADGE = {
  A: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  B: 'bg-blue-100 text-blue-800 border-blue-300',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  D: 'bg-orange-100 text-orange-800 border-orange-300',
  F: 'bg-red-100 text-red-800 border-red-300',
};

const SCORE_BAR_COLOR = (score) => {
  if (score >= 75) return 'bg-emerald-400';
  if (score >= 55) return 'bg-blue-400';
  if (score >= 40) return 'bg-yellow-400';
  return 'bg-red-400';
};

// ---------------------------------------------------------------------------
// MatchCard — one job in the ranked list
// ---------------------------------------------------------------------------
const MatchCard = ({ job, rank }) => {
  const [expanded, setExpanded] = useState(false);
  const badgeStyle = GRADE_BADGE[job.grade] || GRADE_BADGE.F;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Top row: rank + role + grade */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 text-violet-700 text-sm font-bold flex items-center justify-center">
              {rank}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 leading-tight">{job.role}</h3>
              <p className="text-sm text-gray-500">{job.company}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
              Grade {job.grade}
            </span>
            <span className="text-xs text-gray-400">{job.status}</span>
          </div>
        </div>

        {/* Score bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span className="flex items-center gap-1">
              <TrendingUp size={12} /> Match Score
            </span>
            <span className="font-bold text-gray-800">{job.match_score}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${SCORE_BAR_COLOR(job.match_score)}`}
              style={{ width: `${job.match_score}%` }}
            />
          </div>
        </div>

        {/* Quick meta */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {job.location}
            </span>
          )}
          {job.salary && (
            <span className="flex items-center gap-1">
              <DollarSign size={11} /> {job.salary}
            </span>
          )}
        </div>

        {/* Summary */}
        <p className="text-xs text-gray-600 leading-relaxed mb-3">{job.summary}</p>

        {/* Strong matches chips */}
        {job.strong_matches?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {job.strong_matches.slice(0, 4).map(s => (
              <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle size={10} /> {s}
              </span>
            ))}
            {job.strong_matches.length > 4 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                +{job.strong_matches.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Expand / collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1 transition-colors"
        >
          {expanded ? <><ChevronUp size={14} /> less</> : <><ChevronDown size={14} /> details</>}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          {job.missing_skills?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-700 flex items-center gap-1 mb-1">
                <AlertTriangle size={12} /> Skill Gaps
              </p>
              <div className="flex flex-wrap gap-1">
                {job.missing_skills.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {job.recommendations?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-1">Recommendations</p>
              <ul className="space-y-1">
                {job.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                    <span className="text-amber-500 font-bold mt-0.5">→</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {job.jd_link && (
            <a
              href={job.jd_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink size={12} /> View Job Posting
            </a>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------
const BestMatchPanel = ({ currentUser, onClose }) => {
  const [resumeText, setResumeText] = useState(
    () => localStorage.getItem(RESUME_STORAGE_KEY) || ''
  );
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(!resumeText);

  const handleRank = async () => {
    if (!resumeText.trim()) {
      toast.error('Please paste your resume first');
      setShowInput(true);
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      localStorage.setItem(RESUME_STORAGE_KEY, resumeText);
      const res = await intelligenceAPI.rankJobs(resumeText, currentUser, 20);
      setResults(res.data);
      if (res.data.ranked_jobs.length === 0) {
        toast('No jobs with descriptions found. Add job descriptions to enable ranking.', {
          icon: '⚠️',
        });
      }
    } catch (err) {
      toast.error('Ranking failed — please try again');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
        <div className="flex items-center gap-3">
          <Sparkles size={22} />
          <div>
            <h2 className="font-bold text-lg">AI Best Match Jobs</h2>
            <p className="text-violet-200 text-sm">Ranked by semantic resume similarity</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-5">

        {/* Resume input */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
            onClick={() => setShowInput(!showInput)}
          >
            <span className="flex items-center gap-2">
              <Brain size={16} className="text-violet-500" />
              {resumeText ? 'Your Resume (saved)' : 'Paste Your Resume'}
            </span>
            {showInput ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showInput && (
            <div className="p-4 space-y-2">
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume here (plain text or LaTeX)..."
                className="w-full h-36 text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono"
              />
              <p className="text-xs text-gray-400">Saved locally — won't need to paste again.</p>
            </div>
          )}
        </div>

        {/* Rank button */}
        <button
          onClick={handleRank}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Ranking your jobs…</>
            : <><Sparkles size={18} /> {results ? 'Re-rank Jobs' : `Find Best Matches for ${currentUser}`}</>
          }
        </button>

        {/* Results */}
        {results && (
          <div className="space-y-4 animate-slide-up">
            {results.ranked_jobs.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">
                    Top {results.ranked_jobs.length} matches
                  </p>
                  <p className="text-xs text-gray-400">Scores based on TF-IDF + skill overlap</p>
                </div>
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {results.ranked_jobs.map((job, i) => (
                    <MatchCard key={job.row_id} job={job} rank={i + 1} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No scoreable jobs found</p>
                <p className="text-sm mt-1">Add job descriptions to your tracked jobs to enable AI ranking.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BestMatchPanel;
