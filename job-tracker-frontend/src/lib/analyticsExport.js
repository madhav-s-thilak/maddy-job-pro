// Turns an analysis (see computeAnalytics) into downloadable files.
// Pure builders plus one small browser helper, so the builders can be tested.

import { WEEKDAYS, FOLLOW_UP_DAYS, COLD_DAYS, buildSummary, safeHttpUrl } from './analytics';

const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const stamp = (d) => `${isoDay(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const round1 = (n) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);

/**
 * One CSV cell. Text that starts with = + - @ (or a tab / carriage return) would be run as a
 * formula by Excel and Sheets, and company names come from an editable sheet, so it is
 * prefixed with an apostrophe. Real numbers are left alone.
 */
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const sentenceText = (a) => buildSummary(a).map((s) => s.parts.map((p) => p.text).join('')).join(' ');

/** Safe for a file name: lower-case letters, digits and dashes only. */
export function exportFilename(person, ext, now = new Date()) {
  const slug = String(person || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `job-search-analysis-${slug || 'all'}-${isoDay(now)}.${ext}`;
}

/** A spreadsheet-friendly report: several small tables in one file, separated by blank lines. */
export function buildCsv(a, { person = '', now = new Date() } = {}) {
  const lines = [];
  const row = (...cells) => lines.push(cells.map(csvCell).join(','));
  const gap = () => lines.push('');

  row('Job search analysis');
  row('Person', person || 'Everyone');
  row('Generated', stamp(now));
  gap();

  row('Overview');
  row('Metric', 'Value');
  row('Jobs tracked', a.total);
  row('Applied', a.applied);
  row('Replied', a.replied);
  row('Reply rate (%)', a.responseRate);
  row('Reached interview', a.reached);
  row('Offers', a.offers);
  row('Awaiting a reply', a.awaiting);
  row('Saved, not applied', a.saved);
  row('Applied in the last 30 days', a.last30);
  row('Applied in the 30 days before', a.prev30);
  row('Average applications per week', round1(a.avgPerWeek));
  gap();

  row('Where every job went');
  row('Step', 'Jobs');
  const f = a.flow;
  row('Tracked', f.total);
  row('Applied', f.applied);
  row('Not applied yet', f.notApplied);
  row('Dropped before applying', f.droppedBefore);
  row('Awaiting a reply', f.awaiting);
  row('Interview', f.interview);
  row('Offer', f.offer);
  row('Rejected', f.rejected);
  row('Withdrew after applying', f.withdrewAfter);
  gap();

  row('Funnel');
  row('Stage', 'Jobs', '% of previous stage');
  a.funnel.forEach((s) => row(s.label, s.n, s.pctOfPrev));
  gap();

  row('Status');
  row('Status', 'Jobs', '% of all jobs');
  a.statusBar.forEach((s) => row(s.status, s.n, s.pct));
  gap();

  row('Applications per week');
  row('Week starting', 'Week ending', 'Applications', 'Week in progress');
  a.weeks.forEach((w) => row(isoDay(w.start), isoDay(w.end), w.n, w.current ? 'yes' : 'no'));
  gap();

  row('Applications by weekday');
  row('Weekday', 'Applications');
  WEEKDAYS.forEach((name, i) => row(name, a.weekdays[i]));
  gap();

  [
    ['By resume version', a.groups.resume],
    ['By source', a.groups.source],
    ['By work mode', a.groups.mode],
  ].forEach(([title, group]) => {
    row(title);
    row('Name', 'Applied', 'Replied', 'Reply rate (%)', 'Interviews', 'Offers');
    group.rows.forEach((r) => row(r.name, r.applied, r.replied, r.replyRate, r.interviews, r.offers));
    if (group.missing > 0) row('Not recorded', group.missing);
    gap();
  });

  row(`Waiting on a reply (${FOLLOW_UP_DAYS}+ days)`);
  row('Company', 'Role', 'Applied on', 'Days waiting', 'Link');
  a.followUps.forEach(({ job, days, since }) => row(job.company, job.role, isoDay(since), days, safeHttpUrl(job.jd_link)));
  gap();

  row(`Saved, not applied (${COLD_DAYS}+ days)`);
  row('Company', 'Role', 'Saved on', 'Days saved', 'Link');
  a.cold.forEach(({ job, days, since }) => row(job.company, job.role, isoDay(since), days, safeHttpUrl(job.jd_link)));

  // BOM so Excel reads UTF-8; CRLF as the CSV spec asks.
  return `﻿${lines.join('\r\n')}\r\n`;
}

/** The same analysis as structured data. */
export function buildJson(a, { person = '', now = new Date() } = {}) {
  const jobRef = ({ job, days, since }) => ({
    company: job.company || '',
    role: job.role || '',
    date: isoDay(since),
    days,
    link: safeHttpUrl(job.jd_link),
  });
  const group = (g) => ({ rows: g.rows, notRecorded: g.missing });
  return JSON.stringify(
    {
      generatedAt: now.toISOString(),
      person: person || null,
      summary: sentenceText(a),
      overview: {
        tracked: a.total,
        applied: a.applied,
        replied: a.replied,
        replyRatePercent: a.responseRate,
        reachedInterview: a.reached,
        offers: a.offers,
        awaitingReply: a.awaiting,
        savedNotApplied: a.saved,
        appliedLast30Days: a.last30,
        appliedPrevious30Days: a.prev30,
        averageApplicationsPerWeek: round1(a.avgPerWeek),
      },
      flow: a.flow,
      funnel: a.funnel.map(({ key, label, n, pctOfPrev }) => ({ key, label, jobs: n, percentOfPreviousStage: pctOfPrev })),
      status: a.statusBar.map(({ status, n, pct }) => ({ status, jobs: n, percentOfAll: pct })),
      weekly: a.weeks.map((w) => ({
        weekStart: isoDay(w.start),
        weekEnd: isoDay(w.end),
        applications: w.n,
        inProgress: w.current,
      })),
      weekday: WEEKDAYS.map((name, i) => ({ weekday: name, applications: a.weekdays[i] })),
      byResumeVersion: group(a.groups.resume),
      bySource: group(a.groups.source),
      byWorkMode: group(a.groups.mode),
      waitingOnReply: a.followUps.map(jobRef),
      savedNotApplied: a.cold.map(jobRef),
    },
    null,
    2
  );
}

/** Hands a text file to the browser as a download. */
export function downloadFile(filename, mime, text) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
