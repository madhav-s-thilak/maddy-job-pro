import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, ExternalLink, Minus, Plus, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts';
import { jobsAPI } from '../services/api';
import {
  computeAnalytics, buildSummary, goalStats, safeHttpUrl, plural,
  FOLLOW_UP_DAYS, COLD_DAYS, WEEKS_SHOWN, HEAT_WEEKS, WEEKDAYS, MIN_SAMPLE, MIN_HABIT_APPLICATIONS,
} from '../lib/analytics';
import { buildCsv, buildJson, exportFilename, downloadFile } from '../lib/analyticsExport';
import { Card, Empty, Segmented, Sparkline, Meter, RAMP, GRID, AXIS_TEXT } from './analytics/primitives';
import { FlowChart, FlowTable } from './analytics/FlowChart';
import { Heatmap } from './analytics/Heatmap';
import { ExportMenu } from './analytics/ExportMenu';

const GOAL_KEY = 'jobTracker.weeklyGoal';
const DEFAULT_GOAL = 5;
const MAX_GOAL = 100;
const MAX_LIST = 4;
const MUTED_BAR = '#cbd5e1';

const fmtDay = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtTime = (d) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// Storage can be blocked (private windows, strict settings): the goal is a convenience, not essential.
const readGoal = () => {
  try {
    const n = parseInt(window.localStorage.getItem(GOAL_KEY), 10);
    return Number.isFinite(n) && n >= 1 && n <= MAX_GOAL ? n : DEFAULT_GOAL;
  } catch (e) {
    return DEFAULT_GOAL;
  }
};

/** Renders summary parts, bolding the numbers. */
const Parts = ({ parts }) =>
  parts.map((p, i) =>
    p.strong ? <strong key={i} className="font-semibold text-slate-900">{p.text}</strong> : <React.Fragment key={i}>{p.text}</React.Fragment>
  );

const Stat = ({ label, value, children }) => (
  <div className="min-w-0">
    <dt className="text-[13px] text-slate-500">{label}</dt>
    <dd className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</dd>
    {children}
  </div>
);

// ─── Hero: the headline number and where every job went ──────────────────────

const Hero = ({ a }) => {
  const [view, setView] = useState('flow');
  const sentences = useMemo(() => buildSummary(a), [a]);
  const replies = sentences.find((s) => s.key === 'replies');
  const rest = sentences.filter((s) => s.key !== 'replies');
  const completedWeeks = a.weeks.filter((w) => !w.current).map((w) => w.n);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] print:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] print:shadow-none break-inside-avoid">
      <div className="flex flex-col border-b border-slate-200 bg-slate-50/70 p-6 lg:border-b-0 lg:border-r lg:p-8 print:border-b-0 print:border-r">
        <p className="text-[13px] text-slate-500">Reply rate</p>
        <p className="mt-1 text-[56px] font-semibold leading-none tracking-tight text-slate-900">
          {a.responseRate === null ? (
            '—'
          ) : (
            <>
              {a.responseRate}
              <span className="text-[32px] font-medium text-slate-400">%</span>
            </>
          )}
        </p>
        <p className="mt-3 text-sm text-slate-600">
          {replies ? <Parts parts={replies.parts} /> : 'Apply to a job to start measuring replies.'}
        </p>
        <div className="my-6 h-px bg-slate-200" />
        <p className="text-[15px] leading-relaxed text-slate-600">
          {rest.map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && ' '}
              <Parts parts={s.parts} />
            </React.Fragment>
          ))}
        </p>
        <dl className="mt-auto grid grid-cols-3 gap-4 pt-8">
          <Stat label="Applied" value={a.applied}>
            {a.weeksTotal > 0 && (
              <div className="mt-2">
                <Sparkline values={completedWeeks} label={`Applications per week over the last ${completedWeeks.length} completed weeks`} />
              </div>
            )}
          </Stat>
          <Stat label="Interviews" value={a.reached} />
          <Stat label="Offers" value={a.offers} />
        </dl>
      </div>

      <div className="min-w-0 p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold leading-snug text-slate-900">Where your jobs went</h2>
            <p className="mt-1 text-[13px] text-slate-500">Every tracked job, from saved to outcome</p>
          </div>
          <Segmented
            label="Flow or table"
            value={view}
            onChange={setView}
            options={[{ value: 'flow', label: 'Flow' }, { value: 'table', label: 'Table' }]}
          />
        </div>
        <div className="mt-6">
          {/* The diagram needs width; phones get the table instead. Print always gets the diagram. */}
          <div className={`${view === 'flow' ? 'hidden md:block' : 'hidden'} print:block`}>
            <FlowChart flow={a.flow} />
          </div>
          <div className={`${view === 'flow' ? 'md:hidden' : ''} print:hidden`}>
            <FlowTable flow={a.flow} />
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Momentum: weekly pace against a goal ────────────────────────────────────

const WeekTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const w = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] shadow-sm">
      <p className="text-slate-500">
        {w.range}
        {w.current ? ' (in progress)' : ''}
      </p>
      <p className="mt-0.5 text-slate-900">
        <span className="font-semibold tabular-nums">{w.n}</span> {plural(w.n, 'application', 'applications')}
        {w.met && <span className="text-slate-500"> · goal met</span>}
      </p>
    </div>
  );
};

const KeyItem = ({ children, swatch }) => (
  <span className="inline-flex items-center gap-1.5">
    {swatch}
    {children}
  </span>
);

const GoalStepper = ({ goal, onGoal }) => (
  <div className="flex items-center gap-2 text-[13px] text-slate-600 print:hidden">
    <span>Weekly goal</span>
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
      <button type="button" aria-label="Lower the weekly goal" disabled={goal <= 1} onClick={() => onGoal((g) => g - 1)} className="px-2 py-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-40">
        <Minus size={14} />
      </button>
      <span className="min-w-[2rem] text-center font-medium tabular-nums text-slate-900" aria-live="polite">{goal}</span>
      <button type="button" aria-label="Raise the weekly goal" disabled={goal >= MAX_GOAL} onClick={() => onGoal((g) => g + 1)} className="px-2 py-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-40">
        <Plus size={14} />
      </button>
    </div>
  </div>
);

/** Round axis maximum and whole-number ticks (0, 2, 4, 6 rather than 0, 2, 4, 7). */
const niceScale = (max) => {
  const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : 10;
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) };
};

const Momentum = ({ a, goal, onGoal }) => {
  const [view, setView] = useState('chart');
  const g = useMemo(() => goalStats(a.weeks, goal), [a.weeks, goal]);
  const data = a.weeks.map((w, i) => ({
    key: i,
    label: fmtDay(w.start),
    range: `${fmtDay(w.start)} – ${fmtDay(w.end)}`,
    n: w.n,
    current: w.current,
    met: w.n >= g.goal,
  }));

  const scale = niceScale(Math.max(g.goal, 3, ...data.map((d) => d.n)));

  const subtitle =
    g.consideredWeeks > 0
      ? `Goal met in ${g.metWeeks} of the last ${g.consideredWeeks} ${plural(g.consideredWeeks, 'week', 'weeks')}${
          g.streak >= 2 ? ` · ${g.streak}-week streak` : ''
        }`
      : `Applications per week, last ${WEEKS_SHOWN} weeks`;

  return (
    <Card
      title="Applications per week"
      subtitle={subtitle}
      action={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <GoalStepper goal={g.goal} onGoal={onGoal} />
          {a.weeksTotal > 0 && (
            <Segmented
              label="Chart or table"
              value={view}
              onChange={setView}
              options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]}
            />
          )}
        </div>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <p className="text-[13px] text-slate-500">This week</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight text-slate-900">{g.currentN}</span>
            <span className="text-sm text-slate-500">of {g.goal}</span>
            {g.currentPct >= 100 && <Check size={16} className="self-center text-emerald-700" aria-label="Goal met" />}
          </p>
          <div className="mt-2.5"><Meter value={g.currentPct} label="Progress toward this week's goal" /></div>
        </div>
        <div>
          <p className="text-[13px] text-slate-500">4-week average</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {a.avgLast4 === null ? '—' : a.avgLast4.toFixed(1)}
          </p>
          <p className="mt-1 text-[13px] text-slate-500">applications a week</p>
        </div>
        <div>
          <p className="text-[13px] text-slate-500">Best week</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{a.bestWeek ? a.bestWeek.n : '—'}</p>
          <p className="mt-1 text-[13px] text-slate-500">{a.bestWeek ? `week of ${fmtDay(a.bestWeek.start)}` : 'no applications yet'}</p>
        </div>
      </div>

      {a.weeksTotal === 0 ? (
        <Empty className="py-10 text-center">
          No dated applications in the last {WEEKS_SHOWN} weeks. Mark a job as applied and it will appear here.
        </Empty>
      ) : view === 'chart' ? (
        <>
          <div role="img" aria-label={`Bar chart of applications per week against a goal of ${g.goal}. ${subtitle}.`}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 8, right: 52, bottom: 0, left: -8 }} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fontSize: 12, fill: AXIS_TEXT }} minTickGap={8} />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  tick={{ fontSize: 12, fill: AXIS_TEXT }}
                  domain={[0, scale.top]}
                  ticks={scale.ticks}
                />
                <Tooltip cursor={{ fill: '#f1f5f9' }} content={<WeekTooltip />} />
                <ReferenceLine
                  y={g.goal}
                  stroke="#475569"
                  strokeWidth={1}
                  label={{ value: `goal ${g.goal}`, position: 'right', fill: AXIS_TEXT, fontSize: 12 }}
                />
                <Bar dataKey="n" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {data.map((d) => (
                    <Cell key={d.key} fill={d.met ? RAMP.applied : RAMP.tracked} fillOpacity={d.current ? 0.55 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
            <KeyItem swatch={<i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: RAMP.applied }} />}>Met goal</KeyItem>
            <KeyItem swatch={<i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: RAMP.tracked }} />}>Below goal</KeyItem>
            <KeyItem swatch={<i className="h-px w-4 bg-slate-600" />}>Goal</KeyItem>
            <span>Faded bar: week in progress</span>
          </div>
        </>
      ) : (
        <table className="w-full text-[13px]">
          <caption className="sr-only">Applications per week</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th scope="col" className="py-2 font-medium">Week</th>
              <th scope="col" className="py-2 text-right font-medium">Applications</th>
              <th scope="col" className="py-2 text-right font-medium">Goal {g.goal}</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.key} className="border-b border-slate-100 text-slate-700 last:border-0">
                <td className="py-1.5">
                  {d.range}
                  {d.current && <span className="text-slate-400"> (in progress)</span>}
                </td>
                <td className="py-1.5 text-right font-medium tabular-nums text-slate-900">{d.n}</td>
                <td className="py-1.5 text-right text-slate-500">{d.met ? 'Met' : d.current ? '—' : 'Missed'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
};

// ─── Habits: calendar and weekday ─────────────────────────────────────────────

const Consistency = ({ a }) => {
  const activeDays = a.heatmap.flat().filter((c) => c.n > 0).length;
  return (
    <Card
      title="Your consistency"
      subtitle={
        a.heatmapTotal === 0
          ? `Daily applications over the last ${HEAT_WEEKS} weeks`
          : `${activeDays} ${plural(activeDays, 'day', 'days')} with an application in the last ${HEAT_WEEKS} weeks`
      }
    >
      <Heatmap weeks={a.heatmap} total={a.heatmapTotal} />
    </Card>
  );
};

const Weekdays = ({ a }) => {
  const best = a.bestWeekday;
  const max = Math.max(1, ...a.weekdays);
  const dated = a.weekdays.reduce((s, n) => s + n, 0);
  const tied = WEEKDAYS.filter((_, i) => a.weekdays[i] === max);
  const tieText = `${tied.slice(0, -1).join(', ')}${tied.length > 2 ? ',' : ''} and ${tied[tied.length - 1]} tie at ${max}`;
  let subtitle = `${best ? best.n : 0} of ${dated} dated applications`;
  if (!best) {
    subtitle = dated < MIN_HABIT_APPLICATIONS ? `Needs ${MIN_HABIT_APPLICATIONS} dated applications to show a pattern` : tieText;
  }
  return (
    <Card title={best ? `You apply most on ${best.name}s` : 'When you apply'} subtitle={subtitle}>
      <ul className="space-y-2.5">
        {WEEKDAYS.map((name, i) => {
          const n = a.weekdays[i];
          const isBest = best && best.index === i;
          return (
            <li key={name} className="grid grid-cols-[34px_minmax(0,1fr)_24px] items-center gap-3 text-[13px]">
              <span className={isBest ? 'font-medium text-slate-900' : 'text-slate-600'}>{name.slice(0, 3)}</span>
              <div className="h-2.5 bg-slate-100">
                <div
                  className="h-full rounded-r-[4px]"
                  style={{ width: `${n > 0 ? Math.max((n / max) * 100, 2) : 0}%`, background: !best || isBest ? RAMP.applied : MUTED_BAR }}
                />
              </div>
              <span className="text-right font-medium tabular-nums text-slate-900">{n}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

// ─── What's working ──────────────────────────────────────────────────────────

const LENSES = {
  resume: { label: 'Resume', noun: 'resume version', empty: "Record a resume version when you mark a job as applied, and you'll see which one gets more interviews.", missing: 'no resume version recorded' },
  source: { label: 'Source', noun: 'source', empty: 'Save jobs with their posting link and this shows which sites get you replies.', missing: 'no posting link' },
  mode: { label: 'Work mode', noun: 'work mode', empty: 'Add a location to your jobs to compare remote, hybrid and on-site roles.', missing: 'no location' },
};

/** The clear winner, if the data supports naming one. */
const leaderOf = (rows) => {
  const solid = rows
    .filter((r) => !r.smallSample && r.name !== 'Other')
    .sort((x, y) => y.interviewRate - x.interviewRate || y.replyRate - x.replyRate);
  if (solid.length < 2) return null;
  if (solid[0].interviewRate === solid[1].interviewRate && solid[0].replyRate === solid[1].replyRate) return null;
  return solid[0];
};

const WhatsWorking = ({ a }) => {
  const [lens, setLens] = useState('source');
  const { rows, missing } = a.groups[lens];
  const info = LENSES[lens];
  const leader = leaderOf(rows);

  return (
    <Card
      title="What's working"
      subtitle={
        leader
          ? `${leader.name} leads with ${leader.interviewRate}% interviews (${leader.applied} applications)`
          : `Reply and interview rates by ${info.noun}`
      }
      action={
        <Segmented
          label="Compare by"
          value={lens}
          onChange={setLens}
          options={Object.entries(LENSES).map(([value, l]) => ({ value, label: l.label }))}
        />
      }
    >
      {rows.length === 0 ? (
        <Empty>{info.empty}</Empty>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th scope="col" className="py-2 font-medium">{LENSES[lens].label}</th>
              <th scope="col" className="py-2 text-right font-medium">Applied</th>
              <th scope="col" className="w-2/5 py-2 pl-6 font-medium">Reply rate</th>
              <th scope="col" className="py-2 text-right font-medium">Interviews</th>
              <th scope="col" className="py-2 text-right font-medium">Offers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-slate-100 text-slate-700 last:border-0">
                <td className="max-w-[14rem] truncate py-2.5 pr-3 font-medium text-slate-900" title={r.name}>{r.name}</td>
                <td className="py-2.5 text-right tabular-nums">{r.applied}</td>
                <td className="py-2.5 pl-6">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-full min-w-[3rem] overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${r.replyRate || 0}%`, background: r.smallSample ? MUTED_BAR : RAMP.applied }} />
                    </div>
                    <span className={`w-9 text-right tabular-nums ${r.smallSample ? 'text-slate-400' : 'font-medium text-slate-900'}`}>{r.replyRate}%</span>
                  </div>
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  <span className="font-medium text-slate-900">{r.interviews}</span>
                  <span className="text-slate-500"> ({r.interviewRate}%)</span>
                </td>
                <td className="py-2.5 text-right tabular-nums font-medium text-slate-900">{r.offers}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {rows.some((r) => r.smallSample) && (
        <Empty className="mt-3">Grey bars have fewer than {MIN_SAMPLE} applications: treat them as a rough signal.</Empty>
      )}
      {missing > 0 && rows.length > 0 && (
        <Empty className="mt-1.5">
          {missing} {plural(missing, 'application has', 'applications have')} {info.missing}.
        </Empty>
      )}
    </Card>
  );
};

// ─── Needs attention ─────────────────────────────────────────────────────────

const JobRow = ({ job, right }) => {
  const href = safeHttpUrl(job.jd_link);
  return (
    <li className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{job.company || 'Unknown company'}</p>
        <p className="truncate text-[13px] text-slate-500">{job.role}</p>
      </div>
      <p className="whitespace-nowrap text-[13px] tabular-nums text-slate-700">{right}</p>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open the posting for ${job.company || 'this job'}`}
          className="text-slate-400 transition-colors hover:text-slate-700 print:hidden"
        >
          <ExternalLink size={15} />
        </a>
      )}
    </li>
  );
};

const AttentionGroup = ({ title, count, children, emptyText }) => (
  <div>
    <div className="flex items-baseline justify-between">
      <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
      <span className="text-xs tabular-nums text-slate-500">{count}</span>
    </div>
    {count === 0 ? <Empty className="mt-2">{emptyText}</Empty> : children}
  </div>
);

const Attention = ({ a }) => {
  const waiting = a.followUps.slice(0, MAX_LIST);
  const cold = a.cold.slice(0, MAX_LIST);
  const total = a.followUps.length + a.cold.length;
  return (
    <Card title="Needs attention" subtitle={total === 0 ? 'Nothing is overdue' : `${total} ${plural(total, 'job', 'jobs')} to follow up or apply to`}>
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-2 print:grid-cols-2">
        <AttentionGroup title={`Waiting on a reply, ${FOLLOW_UP_DAYS}+ days`} count={a.followUps.length} emptyText="Nothing overdue. Applications still at Applied after two weeks will be listed here.">
          <ul>{waiting.map(({ job, days }) => <JobRow key={job.row_id} job={job} right={`${days} days`} />)}</ul>
          {a.followUps.length > MAX_LIST && <Empty className="mt-2">+{a.followUps.length - MAX_LIST} more</Empty>}
        </AttentionGroup>
        <AttentionGroup title={`Saved, not applied, ${COLD_DAYS}+ days`} count={a.cold.length} emptyText="No saved jobs are going cold.">
          <ul>{cold.map(({ job, days }) => <JobRow key={job.row_id} job={job} right={`saved ${days} days ago`} />)}</ul>
          {a.cold.length > MAX_LIST && <Empty className="mt-2">+{a.cold.length - MAX_LIST} more</Empty>}
        </AttentionGroup>
      </div>
    </Card>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading analytics">
    <div className="h-8 max-w-sm rounded-lg bg-slate-200/70" />
    <div className="h-96 rounded-2xl bg-slate-200/70" />
    <div className="h-96 rounded-2xl bg-slate-200/70" />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="h-72 rounded-2xl bg-slate-200/70 lg:col-span-8" />
      <div className="h-72 rounded-2xl bg-slate-200/70 lg:col-span-4" />
    </div>
  </div>
);

const Analytics = ({ currentUser }) => {
  const [data, setData] = useState(null); // { user, jobs }
  const [status, setStatus] = useState('loading'); // loading | ready | refreshing | error
  const [updatedAt, setUpdatedAt] = useState(null);
  const [goal, setGoal] = useState(readGoal);
  const goalRef = useRef(goal); // latest value, so rapid clicks never act on a stale one
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setStatus((s) => (s === 'ready' || s === 'refreshing' ? 'refreshing' : 'loading'));
    try {
      const res = await jobsAPI.getAll(currentUser);
      if (id !== requestId.current) return; // a newer request (or unmount) superseded this one
      setData({ user: currentUser, jobs: Array.isArray(res.data) ? res.data : [] });
      setUpdatedAt(new Date());
      setStatus('ready');
    } catch (e) {
      if (id !== requestId.current) return;
      setStatus('error');
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => () => { requestId.current += 1; }, []);

  // Accepts a number or a function of the current goal.
  const updateGoal = useCallback((change) => {
    const wanted = typeof change === 'function' ? change(goalRef.current) : change;
    const next = Math.min(MAX_GOAL, Math.max(1, wanted));
    goalRef.current = next;
    setGoal(next);
    try {
      window.localStorage.setItem(GOAL_KEY, String(next));
    } catch (e) {
      /* blocked storage: the goal still works for this visit */
    }
  }, []);

  // Never show one person's numbers under another person's name.
  const a = useMemo(
    () => (data && data.user === currentUser ? computeAnalytics(data.jobs) : null),
    [data, currentUser]
  );
  const busy = status === 'loading' || status === 'refreshing';

  const handleExport = (kind) => {
    if (!a) return;
    const now = new Date();
    const meta = { person: currentUser || '', now };
    try {
      if (kind === 'pdf') {
        // Browsers use the page title as the suggested PDF name.
        const previous = document.title;
        document.title = exportFilename(currentUser, 'pdf', now).replace(/\.pdf$/, '');
        try {
          window.print();
        } finally {
          document.title = previous;
        }
        return;
      }
      const name = exportFilename(currentUser, kind, now);
      if (kind === 'csv') downloadFile(name, 'text/csv', buildCsv(a, meta));
      else downloadFile(name, 'application/json', buildJson(a, meta));
      toast.success(`Downloaded ${name}`);
    } catch (e) {
      toast.error('Could not create the export');
    }
  };

  if (!a && status !== 'error') return <Skeleton />;

  if (!a) {
    return (
      <Card title="Couldn't load your analytics" subtitle="The server didn't return your jobs.">
        <button type="button" onClick={load} className="btn-secondary">Try again</button>
      </Card>
    );
  }

  if (a.total === 0) {
    return (
      <Card title="No jobs to analyse yet" subtitle={currentUser ? `${currentUser} hasn't tracked any jobs.` : undefined}>
        <Empty>Add a job from the Job Tracker, or save one with the browser extension, and your analysis will show up here.</Empty>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 transition-opacity ${status === 'refreshing' ? 'opacity-60' : ''}`}>
      <header className="hidden print:block">
        <h1 className="text-2xl font-semibold text-slate-900">Job search analysis</h1>
        <p className="mt-1 text-sm text-slate-500">
          {currentUser ? `${currentUser} · ` : ''}
          {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-[13px] text-slate-500">
          {currentUser ? `${currentUser} · ` : ''}
          {a.total} {plural(a.total, 'job', 'jobs')}
          {updatedAt ? ` · updated ${fmtTime(updatedAt)}` : ''}
          {status === 'error' && <span className="text-red-700"> {'·'} couldn&rsquo;t refresh</span>}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
            Refresh
          </button>
          <ExportMenu onExport={handleExport} disabled={busy} />
        </div>
      </div>

      <Hero a={a} />

      <Momentum a={a} goal={goal} onGoal={updateGoal} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 print:grid-cols-12">
        <div className="flex lg:col-span-8 print:col-span-8"><Consistency a={a} /></div>
        <div className="flex lg:col-span-4 print:col-span-4"><Weekdays a={a} /></div>
      </div>

      <WhatsWorking a={a} />

      <Attention a={a} />

      <p className="text-xs leading-relaxed text-slate-500">
        Applied includes jobs that moved on to Interview, Offer or Rejected. Interviews counts jobs now at Interview or Offer; a
        rejection after an interview can&rsquo;t be told apart from an earlier one. Work mode is read from the Location and Role text:
        a place name without &ldquo;remote&rdquo; or &ldquo;hybrid&rdquo; counts as on-site.
        {a.undatedApplied > 0 && (
          <>
            {' '}{a.undatedApplied} applied {plural(a.undatedApplied, 'job has', 'jobs have')} no valid applied date, so{' '}
            {plural(a.undatedApplied, 'it is', 'they are')} left out of the weekly chart, calendar, 30-day figures and follow-up list.
          </>
        )}
      </p>
    </div>
  );
};

export default Analytics;
