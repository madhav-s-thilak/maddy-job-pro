// Pure analytics over the jobs list: no React, no network, so it is easy to test.
//
// Definitions (the Analytics page explains the same ones to the reader):
//   applied     jobs now at Applied, Interview, Offer or Rejected, plus withdrawn
//               jobs that have an applied date. A job that moved on to Interview
//               is still an application, so it stays in this count.
//   reached     jobs now at Interview or Offer. A rejection after an interview
//               cannot be told apart from a rejection before one, so those are
//               not counted here.
//   replied     jobs now at Interview, Offer or Rejected (any answer at all).
//   awaiting    jobs still at Applied: no reply yet.

export const STATUSES = ['Not Applied', 'Applied', 'Interview', 'Offer', 'Withdrawn', 'Rejected'];
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WEEKS_SHOWN = 12;
export const HEAT_WEEKS = 26;
export const FOLLOW_UP_DAYS = 14;
export const COLD_DAYS = 14;
export const MIN_SAMPLE = 5; // fewer applications than this is a rough signal, not a finding
const MAX_SOURCE_ROWS = 6;
export const MIN_HABIT_APPLICATIONS = 8;

const DAY_MS = 86400000;
const APPLIED_STATUSES = new Set(['Applied', 'Interview', 'Offer', 'Rejected']);
const REPLIED_STATUSES = new Set(['Interview', 'Offer', 'Rejected']);
const BY_LOWER = new Map(STATUSES.map((s) => [s.toLowerCase(), s]));

/** Sheet cells are typed by hand sometimes: match case-insensitively, default to Not Applied. */
export const normalizeStatus = (value) =>
  BY_LOWER.get(String(value || '').trim().toLowerCase()) || 'Not Applied';

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// Rounded because a day is 23 or 25 hours across a daylight-saving change.
const daysBetween = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
const mondayOf = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/**
 * Parses a date cell ("Date Applied", "Created At"). Only unambiguous year-first dates
 * are accepted (2026-03-05, 2026-03-05T10:00:00, 2026/03/05). Anything else, an
 * impossible date, or a date in the future returns null rather than a guess.
 */
export function parseDay(value, now = new Date()) {
  const m = String(value || '')
    .trim()
    .match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:$|[T\s])/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  if (year < 2000 || date > startOfDay(now)) return null;
  return date;
}
export const parseAppliedDate = parseDay;

/** Only http(s) links are safe to render as href: the sheet is user-editable data. */
export const safeHttpUrl = (value) => {
  const url = String(value || '').trim();
  return /^https?:\/\//i.test(url) ? url : '';
};

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : null);

// ── Where / how a job was found ────────────────────────────────────────────────

const KNOWN_SOURCES = [
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)greenhouse\.io$/, 'Greenhouse'],
  [/(^|\.)(wellfound\.com|angel\.co)$/, 'Wellfound'],
  [/(^|\.)lever\.co$/, 'Lever'],
  [/(^|\.)ashbyhq\.com$/, 'Ashby'],
  [/(^|\.)(myworkdayjobs\.com|workday\.com)$/, 'Workday'],
  [/(^|\.)indeed\.com$/, 'Indeed'],
  [/(^|\.)glassdoor\.[a-z.]+$/, 'Glassdoor'],
  [/(^|\.)smartrecruiters\.com$/, 'SmartRecruiters'],
  [/(^|\.)workable\.com$/, 'Workable'],
  [/(^|\.)ycombinator\.com$/, 'Work at a Startup'],
  [/(^|\.)(ziprecruiter|monster|dice|simplyhired|builtin|otta|welcometothejungle)\.com$/, 'Job board'],
];

/** The channel a job came through, read from its posting link. '' when there is no usable link. */
export function sourceOf(job) {
  const link = safeHttpUrl(job && job.jd_link);
  if (!link) return '';
  let host;
  try {
    host = new URL(link).hostname.toLowerCase();
  } catch (e) {
    return '';
  }
  const known = KNOWN_SOURCES.find(([re]) => re.test(host));
  return known ? known[1] : 'Company site';
}

/** Remote / Hybrid / On-site from the Location and Role text. '' when there is nothing to go on. */
export function workModeOf(job) {
  const location = String((job && job.location) || '').trim();
  const text = `${location} ${(job && job.role) || ''}`;
  if (/\bremote\b|work from home|\bwfh\b|\banywhere\b/i.test(text)) return 'Remote';
  if (/\bhybrid\b/i.test(text)) return 'Hybrid';
  return location ? 'On-site' : '';
}

// ── Main computation ───────────────────────────────────────────────────────────

function groupRows(appliedRows, keyOf, { capRows = 0 } = {}) {
  const map = new Map();
  let missing = 0;
  appliedRows.forEach(({ job, status }) => {
    const name = keyOf(job);
    if (!name) {
      missing += 1;
      return;
    }
    const e = map.get(name) || { name, applied: 0, replied: 0, interviews: 0, offers: 0 };
    e.applied += 1;
    if (REPLIED_STATUSES.has(status)) e.replied += 1;
    if (status === 'Interview' || status === 'Offer') e.interviews += 1;
    if (status === 'Offer') e.offers += 1;
    map.set(name, e);
  });
  let rows = Array.from(map.values()).sort((a, b) => b.applied - a.applied || a.name.localeCompare(b.name));
  if (capRows && rows.length > capRows) {
    const keep = rows.slice(0, capRows - 1);
    const other = rows.slice(capRows - 1).reduce(
      (acc, r) => ({
        name: 'Other',
        applied: acc.applied + r.applied,
        replied: acc.replied + r.replied,
        interviews: acc.interviews + r.interviews,
        offers: acc.offers + r.offers,
      }),
      { name: 'Other', applied: 0, replied: 0, interviews: 0, offers: 0 }
    );
    rows = [...keep, other];
  }
  rows = rows.map((r) => ({
    ...r,
    replyRate: pct(r.replied, r.applied),
    interviewRate: pct(r.interviews, r.applied),
    smallSample: r.applied < MIN_SAMPLE,
  }));
  return { rows, missing };
}

export function computeAnalytics(jobs, now = new Date()) {
  const list = Array.isArray(jobs) ? jobs : [];
  const today = startOfDay(now);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  const rows = list.map((job) => {
    const status = normalizeStatus(job.status);
    counts[status] += 1;
    const date = parseDay(job.date_applied, now);
    const applied = APPLIED_STATUSES.has(status) || (status === 'Withdrawn' && date !== null);
    return { job, status, date, applied };
  });

  const total = list.length;
  const applied = rows.filter((r) => r.applied);
  const reached = counts.Interview + counts.Offer;
  const replied = counts.Interview + counts.Offer + counts.Rejected;

  const funnel = [
    { key: 'tracked', label: 'Tracked', n: total, of: null, ofLabel: null },
    { key: 'applied', label: 'Applied', n: applied.length, of: total, ofLabel: 'tracked' },
    { key: 'interview', label: 'Interview', n: reached, of: applied.length, ofLabel: 'applied' },
    { key: 'offer', label: 'Offer', n: counts.Offer, of: reached, ofLabel: 'interviews' },
  ].map((stage) => ({
    ...stage,
    pctOfPrev: stage.of === null ? null : pct(stage.n, stage.of),
    shareOfTotal: total > 0 ? stage.n / total : 0,
  }));

  const statusBar = STATUSES.map((status) => ({ status, n: counts[status], pct: pct(counts[status], total) }));

  // Where every job went. Both levels sum exactly:
  //   total   = applied + notApplied + droppedBefore
  //   applied = awaiting + interview + offer + rejected + withdrewAfter
  const withdrewAfter = rows.filter((r) => r.status === 'Withdrawn' && r.applied).length;
  const flow = {
    total,
    applied: applied.length,
    notApplied: counts['Not Applied'],
    droppedBefore: counts.Withdrawn - withdrewAfter,
    awaiting: counts.Applied,
    interview: counts.Interview,
    offer: counts.Offer,
    rejected: counts.Rejected,
    withdrewAfter,
  };

  // Weekly applications, oldest first, weeks starting on Monday.
  const thisMonday = mondayOf(today);
  const firstWeek = addDays(thisMonday, -7 * (WEEKS_SHOWN - 1));
  const weeks = Array.from({ length: WEEKS_SHOWN }, (_, i) => {
    const start = addDays(firstWeek, 7 * i);
    return { start, end: addDays(start, 6), n: 0, current: i === WEEKS_SHOWN - 1 };
  });
  let last30 = 0;
  let prev30 = 0;
  const weekdays = Array(7).fill(0);
  const dayCounts = new Map();
  const datedApplied = applied.filter((r) => r.date);
  datedApplied.forEach(({ date }) => {
    const idx = Math.floor(daysBetween(firstWeek, date) / 7);
    if (idx >= 0 && idx < WEEKS_SHOWN) weeks[idx].n += 1;
    const ago = daysBetween(date, today);
    if (ago < 30) last30 += 1;
    else if (ago < 60) prev30 += 1;
    weekdays[(date.getDay() + 6) % 7] += 1;
    const key = dayKey(date);
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
  });

  // Averages run over completed weeks only, starting from the first week with activity,
  // so a search that began recently is not diluted by empty weeks before it.
  const completed = weeks.filter((w) => !w.current);
  const firstActive = completed.findIndex((w) => w.n > 0);
  const activeSpan = firstActive === -1 ? [] : completed.slice(firstActive);
  const mean = (list2) => (list2.length ? list2.reduce((s, w) => s + w.n, 0) / list2.length : null);
  const avgPerWeek = mean(activeSpan);
  const avgLast4 = mean(activeSpan.slice(-4));
  const bestWeek = weeks.reduce((best, w) => (w.n > 0 && (!best || w.n >= best.n) ? w : best), null);

  // Habits: which weekday, and a calendar of the last HEAT_WEEKS weeks.
  const maxWeekday = Math.max(...weekdays);
  const topDays = weekdays.filter((n) => n === maxWeekday).length;
  const bestWeekday =
    datedApplied.length >= MIN_HABIT_APPLICATIONS && maxWeekday > 0 && topDays === 1
      ? { index: weekdays.indexOf(maxWeekday), name: WEEKDAYS[weekdays.indexOf(maxWeekday)], n: maxWeekday }
      : null;
  const heatFirst = addDays(thisMonday, -7 * (HEAT_WEEKS - 1));
  const heatmap = Array.from({ length: HEAT_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(heatFirst, w * 7 + d);
      const future = date > today;
      return { date, future, n: future ? 0 : dayCounts.get(dayKey(date)) || 0 };
    })
  );
  const heatmapTotal = heatmap.flat().reduce((s, c) => s + c.n, 0);
  const heatmapMax = Math.max(0, ...heatmap.flat().map((c) => c.n));

  const awaiting = rows.filter((r) => r.status === 'Applied');
  const followUps = awaiting
    .filter((r) => r.date && daysBetween(r.date, today) >= FOLLOW_UP_DAYS)
    .map((r) => ({ job: r.job, days: daysBetween(r.date, today), since: r.date }))
    .sort((a, b) => b.days - a.days);

  // Saved jobs that have sat untouched.
  const saved = rows.filter((r) => r.status === 'Not Applied');
  const cold = saved
    .map((r) => ({ job: r.job, created: parseDay(r.job.created_at, now) }))
    .filter((r) => r.created && daysBetween(r.created, today) >= COLD_DAYS)
    .map((r) => ({ job: r.job, days: daysBetween(r.created, today), since: r.created }))
    .sort((a, b) => b.days - a.days);

  // What is working: the same comparison across three lenses.
  const groups = {
    resume: groupRows(applied, (j) => String(j.resume_version || '').trim()),
    source: groupRows(applied, sourceOf, { capRows: MAX_SOURCE_ROWS }),
    mode: groupRows(applied, workModeOf),
  };

  return {
    total,
    counts,
    applied: applied.length,
    reached,
    replied,
    offers: counts.Offer,
    awaiting: awaiting.length,
    responseRate: pct(replied, applied.length),
    funnel,
    statusBar,
    flow,
    weeks,
    weeksTotal: weeks.reduce((s, w) => s + w.n, 0),
    avgPerWeek,
    avgLast4,
    bestWeek,
    last30,
    prev30,
    weekdays,
    bestWeekday,
    heatmap,
    heatmapTotal,
    heatmapMax,
    followUps,
    awaitingUndated: awaiting.filter((r) => !r.date).length,
    undatedApplied: applied.length - datedApplied.length,
    saved: saved.length,
    cold,
    groups,
  };
}

// ── Weekly goal ─────────────────────────────────────────────────────────────────

/** Progress against a weekly application target. Streak counts weeks at goal ending now. */
export function goalStats(weeks, goal) {
  const g = Math.max(1, Math.floor(Number(goal)) || 1);
  const current = weeks[weeks.length - 1];
  const completed = weeks.slice(0, -1);
  const firstActive = completed.findIndex((w) => w.n > 0);
  const considered = firstActive === -1 ? [] : completed.slice(firstActive);

  let streak = current.n >= g ? 1 : 0; // an unfinished week only helps, never breaks a streak
  for (let i = completed.length - 1; i >= 0 && completed[i].n >= g; i -= 1) streak += 1;

  return {
    goal: g,
    currentN: current.n,
    currentPct: Math.min(100, Math.round((current.n / g) * 100)),
    metWeeks: considered.filter((w) => w.n >= g).length,
    consideredWeeks: considered.length,
    streak,
  };
}

// ── Plain-language summary ────────────────────────────────────────────────────

export const plural = (n, one, many) => (n === 1 ? one : many);
const S = (text) => ({ text });
const B = (text) => ({ text: String(text), strong: true });

/**
 * Returns sentences as {key, parts}; parts are {text, strong?} so the page can bold the
 * numbers. Empty when there is nothing to say. Keys: pace, replies, waiting, offers.
 */
export function buildSummary(a) {
  if (!a || a.total === 0) return [];

  if (a.applied === 0) {
    return [
      {
        key: 'pace',
        parts: [S("You're tracking "), B(a.total), S(` ${plural(a.total, 'job', 'jobs')} but haven't applied to any yet.`)],
      },
    ];
  }

  const sentences = [];

  const pace = [B(a.applied), S(` ${plural(a.applied, 'application', 'applications')} so far`)];
  if (a.last30 > 0) {
    pace.push(S(', '), B(a.last30), S(' in the last 30 days'));
    if (a.prev30 > 0) {
      if (a.last30 > a.prev30) pace.push(S(` (up from ${a.prev30} the month before)`));
      else if (a.last30 < a.prev30) pace.push(S(` (down from ${a.prev30} the month before)`));
      else pace.push(S(' (level with the month before)'));
    } else {
      pace.push(S(' (none the month before)'));
    }
  } else if (a.applied - a.undatedApplied > 0) {
    pace.push(S(', none in the last 30 days'));
  }
  pace.push(S('.'));
  sentences.push({ key: 'pace', parts: pace });

  sentences.push({
    key: 'replies',
    parts: a.replied === 0 ? [S('No replies yet.')] : [B(a.replied), S(` of ${a.applied} have replied.`)],
  });

  if (a.followUps.length > 0) {
    const n = a.followUps.length;
    sentences.push({
      key: 'waiting',
      parts: [
        B(n),
        S(` ${plural(n, 'application has', 'applications have')} been waiting ${FOLLOW_UP_DAYS}+ days for a reply.`),
      ],
    });
  }

  if (a.offers > 0) {
    sentences.push({ key: 'offers', parts: [B(a.offers), S(` ${plural(a.offers, 'offer', 'offers')} received.`)] });
  }

  return sentences;
}
