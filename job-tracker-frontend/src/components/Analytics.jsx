import React, { useState, useEffect, useCallback } from 'react';
import { jobsAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { Briefcase, CheckCircle, XCircle, Clock, Award, TrendingUp, ArrowRight } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar,
} from 'recharts';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  'Not Applied': '#94a3b8',
  'Applied':     '#3b82f6',
  'Interview':   '#f59e0b',
  'Offer':       '#10b981',
  'Rejected':    '#ef4444',
  'Withdrawn':   '#8b5cf6',
};

const STAT_CARDS = [
  { key: 'total_jobs',       label: 'Total Jobs',  icon: Briefcase,   from: 'from-blue-500',    to: 'to-blue-700'    },
  { key: 'applied_count',    label: 'Applied',     icon: CheckCircle, from: 'from-emerald-500', to: 'to-emerald-700' },
  { key: 'interview_count',  label: 'Interviews',  icon: Clock,       from: 'from-amber-400',   to: 'to-amber-600'   },
  { key: 'offer_count',      label: 'Offers',      icon: Award,       from: 'from-purple-500',  to: 'to-purple-700'  },
  { key: 'rejected_count',   label: 'Rejected',    icon: XCircle,     from: 'from-red-500',     to: 'to-red-700'     },
  { key: 'unique_companies', label: 'Companies',   icon: TrendingUp,  from: 'from-indigo-500',  to: 'to-indigo-700'  },
];

// ─── Custom tooltips ─────────────────────────────────────────────────────────

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl border border-white/10">
      {label && <p className="font-semibold text-white/70 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.fill || p.color || '#fff' }}>
          {p.name || p.dataKey}: <span className="text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Pipeline stage flow ─────────────────────────────────────────────────────

const PipelineStage = ({ label, count, color, pct, isLast }) => (
  <div className="flex items-center gap-0">
    <div className={`flex flex-col items-center justify-center px-5 py-4 rounded-xl ${color} text-white min-w-[90px]`}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-[10px] font-semibold mt-0.5 opacity-90">{label}</span>
    </div>
    {!isLast && (
      <div className="flex flex-col items-center mx-1">
        <ArrowRight size={18} className="text-gray-300" />
        <span className="text-[10px] text-gray-400 font-medium">{pct}%</span>
      </div>
    )}
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

const Analytics = ({ currentUser }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobsAPI.getAnalytics(currentUser);
      setData(res.data);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  }, [currentUser]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
    </div>
  );
  if (!data) return null;

  // Derived values
  const breakdown = data.status_breakdown || {};
  const donutData = Object.entries(breakdown).map(([name, value]) => ({ name, value }));

  const barData = Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.replace(' ', '\n'), value, fill: STATUS_COLORS[name] || '#94a3b8' }))
    .sort((a, b) => b.value - a.value);

  const appRate   = data.total_jobs    > 0 ? Math.round((data.applied_count   || 0) / data.total_jobs    * 100) : 0;
  const itvRate   = (data.applied_count    || 0) > 0 ? Math.round((data.interview_count  || 0) / data.applied_count    * 100) : 0;
  const offerRate = (data.interview_count  || 0) > 0 ? Math.round((data.offer_count      || 0) / data.interview_count  * 100) : 0;

  const radialData = [
    { name: 'App Rate',   value: appRate,   fill: '#3b82f6' },
    { name: 'Itv Rate',   value: itvRate,   fill: '#f59e0b' },
    { name: 'Offer Rate', value: offerRate, fill: '#10b981' },
  ];

  const pipeline = [
    { label: 'Tracked',    count: data.total_jobs         || 0, color: 'bg-indigo-500',  pct: appRate   },
    { label: 'Applied',    count: data.applied_count      || 0, color: 'bg-blue-500',    pct: itvRate   },
    { label: 'Interviews', count: data.interview_count    || 0, color: 'bg-amber-500',   pct: offerRate },
    { label: 'Offers',     count: data.offer_count        || 0, color: 'bg-emerald-500', pct: null      },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, from, to }) => (
          <div
            key={key}
            className={`bg-gradient-to-br ${from} ${to} rounded-2xl p-4 text-white shadow-lg hover:scale-105 transition-transform duration-200`}
          >
            <div className="bg-white/20 rounded-xl w-9 h-9 flex items-center justify-center mb-3">
              <Icon size={18} className="text-white" />
            </div>
            <p className="text-3xl font-bold">{data[key] ?? 0}</p>
            <p className="text-white/80 text-xs mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Pipeline flow ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-700 to-blue-700 px-5 py-4">
          <h3 className="font-bold text-white text-sm">Application Pipeline</h3>
          <p className="text-indigo-200 text-xs mt-0.5">Conversion at each stage</p>
        </div>
        <div className="p-5 flex flex-wrap items-center gap-1">
          {pipeline.map((stage, i) => (
            <PipelineStage
              key={stage.label}
              {...stage}
              isLast={i === pipeline.length - 1}
            />
          ))}
          {data.rejected_count > 0 && (
            <div className="ml-4 flex items-center gap-2">
              <div className="w-px h-10 bg-gray-200" />
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
                <p className="text-xl font-bold text-red-600">{data.rejected_count}</p>
                <p className="text-[10px] text-red-500 font-semibold">Rejected</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Charts row 1: Donut + Bar ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Donut */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4">
            <h3 className="font-bold text-white text-sm">Status Distribution</h3>
            <p className="text-slate-400 text-xs mt-0.5">Portfolio breakdown by status</p>
          </div>
          <div className="p-4">
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={donutData} cx="50%" cy="50%"
                    innerRadius={60} outerRadius={95}
                    paddingAngle={3} dataKey="value"
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                  <Legend formatter={v => <span className="text-xs text-gray-600 font-medium">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
            )}
          </div>
        </div>

        {/* Horizontal bar chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-4">
            <h3 className="font-bold text-white text-sm">Jobs by Status</h3>
            <p className="text-violet-200 text-xs mt-0.5">Count per application stage</p>
          </div>
          <div className="p-4">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts row 2: Radial gauges + Funnel rates ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Radial conversion gauges */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4">
            <h3 className="font-bold text-white text-sm">Conversion Rate Gauges</h3>
            <p className="text-emerald-100 text-xs mt-0.5">How efficiently your pipeline converts</p>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart
                cx="50%" cy="55%"
                innerRadius={30} outerRadius={90}
                data={radialData}
                startAngle={180} endAngle={-180}
              >
                <RadialBar
                  minAngle={5}
                  dataKey="value"
                  background={{ fill: '#f1f5f9' }}
                  cornerRadius={6}
                />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
                        <p className="font-semibold">{payload[0].payload.name}</p>
                        <p className="text-white font-bold">{payload[0].value}%</p>
                      </div>
                    ) : null
                  }
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value, entry) => (
                    <span className="text-xs text-gray-600 font-medium">
                      {entry.payload.name}: <strong>{entry.payload.value}%</strong>
                    </span>
                  )}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed funnel rates */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-4">
            <h3 className="font-bold text-white text-sm">Conversion Funnel</h3>
            <p className="text-amber-100 text-xs mt-0.5">Stage-by-stage conversion breakdown</p>
          </div>
          <div className="p-5 space-y-5">
            {[
              { label: 'Application Rate', pct: appRate,   color: 'from-blue-400 to-blue-600',    textColor: 'text-blue-600',    sub: `${data.applied_count || 0} of ${data.total_jobs} tracked` },
              { label: 'Interview Rate',   pct: itvRate,   color: 'from-amber-400 to-amber-600',  textColor: 'text-amber-600',   sub: `${data.interview_count || 0} from ${data.applied_count || 0} applications` },
              { label: 'Offer Rate',       pct: offerRate, color: 'from-emerald-400 to-emerald-600', textColor: 'text-emerald-600', sub: `${data.offer_count || 0} from ${data.interview_count || 0} interviews` },
            ].map(({ label, pct, color, textColor, sub }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                  <span className={`text-xl font-bold ${textColor}`}>{pct}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
            ))}

            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Insights</p>
              <ul className="space-y-1.5 text-sm text-gray-600">
                {appRate < 50 && <li className="flex gap-2"><span className="text-blue-500 font-bold">→</span>Apply to more saved jobs to build pipeline momentum</li>}
                {itvRate > 20 && <li className="flex gap-2"><span className="text-emerald-500 font-bold">★</span>Strong interview conversion — your resume is landing!</li>}
                {data.offer_count > 0 && <li className="flex gap-2"><span className="text-amber-500 font-bold">🎉</span>You have an offer — time to negotiate!</li>}
                {data.total_jobs > 50 && <li className="flex gap-2"><span className="text-purple-500 font-bold">→</span>Large pipeline — prioritise quality applications</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Analytics;
