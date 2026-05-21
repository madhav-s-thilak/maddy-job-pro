import React, { useState } from 'react';
import { portfolioAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  Github, Star, ExternalLink, CheckCircle, AlertTriangle,
  Lightbulb, Loader2, Globe, Code2, FileText
} from 'lucide-react';

const LANG_COLORS = {
  Python: 'bg-blue-100 text-blue-700 border-blue-200',
  JavaScript: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  TypeScript: 'bg-blue-100 text-blue-800 border-blue-300',
  HTML: 'bg-orange-100 text-orange-700 border-orange-200',
  CSS: 'bg-pink-100 text-pink-700 border-pink-200',
  Java: 'bg-red-100 text-red-700 border-red-200',
  Go: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Rust: 'bg-orange-100 text-orange-800 border-orange-300',
  default: 'bg-gray-100 text-gray-700 border-gray-200',
};

const langStyle = (lang) => LANG_COLORS[lang] || LANG_COLORS.default;

const ScoreRing = ({ score, dark = false }) => {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const gradId = 'portfolio-score-grad';
  const color1 = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const color2 = score >= 70 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  const track  = dark ? 'rgba(255,255,255,0.12)' : (score >= 70 ? '#d1fae5' : score >= 50 ? '#fef3c7' : '#fee2e2');

  return (
    <div className="relative shrink-0">
      <svg width="124" height="124" className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>
        <circle cx="62" cy="62" r={r} fill="none" stroke={track} strokeWidth="12" />
        <circle
          cx="62" cy="62" r={r} fill="none" strokeWidth="12"
          strokeDasharray={`${(score / 100) * circ} ${circ}`}
          strokeLinecap="round"
          stroke={`url(#${gradId})`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{score}</span>
        <span className={`text-xs font-medium ${dark ? 'text-white/50' : 'text-gray-400'}`}>/100</span>
      </div>
    </div>
  );
};

const RepoCard = ({ repo }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="flex-1 min-w-0">
        <a
          href={repo.url} target="_blank" rel="noopener noreferrer"
          className="text-sm font-bold text-blue-600 hover:text-blue-800 truncate block hover:underline"
        >
          {repo.name}
        </a>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{repo.description || 'No description added'}</p>
      </div>
      <div className="text-center shrink-0">
        <span className={`text-sm font-bold ${
          repo.quality_score >= 50 ? 'text-emerald-600' :
          repo.quality_score >= 30 ? 'text-amber-600' : 'text-red-500'
        }`}>
          {repo.quality_score}%
        </span>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-2 mt-3">
      {repo.language && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${langStyle(repo.language)}`}>
          <Code2 size={9} className="inline mr-1" />{repo.language}
        </span>
      )}
      {repo.stars > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-amber-600 font-semibold">
          <Star size={11} className="fill-amber-400 text-amber-400" /> {repo.stars}
        </span>
      )}
      {repo.homepage && (
        <a href={repo.homepage} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:underline ml-auto">
          <Globe size={11} /> Live Demo →
        </a>
      )}
    </div>

    {/* Quality bar */}
    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${
          repo.quality_score >= 50 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
          repo.quality_score >= 30 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
          'bg-gradient-to-r from-red-400 to-rose-500'
        }`}
        style={{ width: `${repo.quality_score}%` }}
      />
    </div>
  </div>
);

const PortfolioCritic = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!githubUrl.trim()) return toast.error('Enter a GitHub URL or username');
    setLoading(true); setResult(null);
    try {
      const res = await portfolioAPI.analyze(githubUrl);
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analysis failed — check the URL');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Input */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-gray-900 px-5 py-4 flex items-center gap-3">
          <Github size={20} className="text-white" />
          <div>
            <p className="text-white font-bold text-sm">Portfolio Critic</p>
            <p className="text-gray-400 text-xs">Recruiter-style GitHub analysis</p>
          </div>
        </div>
        <div className="p-4 flex gap-3">
          <div className="relative flex-1">
            <Github size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text" value={githubUrl}
              onChange={e => setGithubUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="https://github.com/username  or  just the username"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-gray-50"
            />
          </div>
          <button
            onClick={handleAnalyze} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-800 to-gray-900 text-white text-sm font-bold rounded-xl hover:from-slate-700 hover:to-gray-800 transition-all shadow-md disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Github size={15} />}
            Analyze
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-gray-100 border-t-gray-800 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Fetching GitHub profile and analysing repositories…</p>
        </div>
      )}

      {result && (
        <div className="space-y-5 animate-slide-up">
          {/* Profile card — everything lives inside the gradient, no overlap */}
          <div
            className="rounded-2xl shadow-lg overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1e293b 0%, #312e81 55%, #1e1b4b 100%)' }}
          >
            {/* Decorative blobs */}
            <div className="absolute pointer-events-none">
              <div className="w-48 h-48 rounded-full bg-indigo-600/10 blur-3xl -translate-y-10 translate-x-64" />
            </div>

            <div className="relative px-6 py-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Score ring (white text version) */}
              <div className="shrink-0">
                <ScoreRing score={result.profile_score} dark />
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <a
                  href={result.profile_url} target="_blank" rel="noopener noreferrer"
                  className="text-2xl font-bold text-white hover:text-indigo-300 transition-colors inline-flex items-center gap-2"
                >
                  @{result.username}
                  <ExternalLink size={16} className="text-white/50" />
                </a>
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-2 text-sm text-white/60">
                  <span>{result.total_repos} repos total</span>
                  <span>·</span>
                  <span>{result.original_repos} original</span>
                </div>
                {result.languages?.length > 0 && (
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                    {result.languages.map(l => (
                      <span key={l} className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/80 border border-white/20">
                        {l}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Strengths + Weaknesses */}
          <div className="grid md:grid-cols-2 gap-4">
            {result.strengths?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3.5">
                  <p className="text-white font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle size={14} /> Recruiter Strengths
                  </p>
                </div>
                <ul className="p-4 space-y-2.5">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.weaknesses?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3.5">
                  <p className="text-white font-bold text-xs flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Areas to Improve
                  </p>
                </div>
                <ul className="p-4 space-y-2.5">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">✗</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action items */}
          {result.recommendations?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-4">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Lightbulb size={16} /> Recruiter Action Items
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

          {/* Top repos */}
          {result.top_repos?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Top Repositories</p>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {result.top_repos.map(repo => <RepoCard key={repo.name} repo={repo} />)}
              </div>
            </div>
          )}

          {/* README quality */}
          {result.readme_analyses?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">README Quality</p>
              <div className="space-y-2">
                {result.readme_analyses.map(ra => (
                  <div
                    key={ra.repo}
                    className="bg-white border border-gray-100 rounded-xl px-4 py-3.5 flex items-center gap-3 hover:shadow-sm transition-shadow"
                  >
                    <FileText size={16} className="text-gray-400 shrink-0" />
                    <span className="flex-1 text-sm font-semibold text-gray-800">{ra.repo}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      ra.readme_score >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      ra.readme_score >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {ra.readme_score}/100
                    </span>
                    {ra.issues?.length > 0 && (
                      <p className="text-xs text-gray-400 hidden sm:block max-w-xs truncate">{ra.issues[0]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortfolioCritic;
