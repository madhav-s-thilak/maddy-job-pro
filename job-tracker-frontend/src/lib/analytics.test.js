import {
  computeAnalytics,
  buildSummary,
  goalStats,
  parseAppliedDate,
  normalizeStatus,
  safeHttpUrl,
  sourceOf,
  workModeOf,
  WEEKS_SHOWN,
  HEAT_WEEKS,
} from './analytics';

// Wednesday 21 Oct 2026, so the current week runs Mon 19 Oct to Sun 25 Oct.
const NOW = new Date(2026, 9, 21, 12, 0, 0);
const ago = (days) => {
  const d = new Date(2026, 9, 21 - days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const job = (status, extra = {}) => ({ company: 'Acme', role: 'Engineer', status, date_applied: '', resume_version: '', jd_link: '', ...extra });
const text = (sentences) => sentences.map((s) => s.parts.map((p) => p.text).join('')).join(' ');

describe('normalizeStatus', () => {
  test('matches case-insensitively and defaults to Not Applied', () => {
    expect(normalizeStatus('applied')).toBe('Applied');
    expect(normalizeStatus('  INTERVIEW ')).toBe('Interview');
    expect(normalizeStatus('')).toBe('Not Applied');
    expect(normalizeStatus(undefined)).toBe('Not Applied');
    expect(normalizeStatus('Ghosted')).toBe('Not Applied');
  });
});

describe('parseAppliedDate', () => {
  test('accepts year-first dates, with or without a time', () => {
    expect(parseAppliedDate('2026-03-05', NOW)).toEqual(new Date(2026, 2, 5));
    expect(parseAppliedDate('2026-03-05T10:30:00', NOW)).toEqual(new Date(2026, 2, 5));
    expect(parseAppliedDate('2026/03/05', NOW)).toEqual(new Date(2026, 2, 5));
  });
  test('rejects ambiguous, impossible, future and empty values instead of guessing', () => {
    expect(parseAppliedDate('03/05/2026', NOW)).toBeNull();
    expect(parseAppliedDate('5 March 2026', NOW)).toBeNull();
    expect(parseAppliedDate('2026-02-30', NOW)).toBeNull();
    expect(parseAppliedDate('2026-13-01', NOW)).toBeNull();
    expect(parseAppliedDate('2026-10-22', NOW)).toBeNull(); // tomorrow
    expect(parseAppliedDate('', NOW)).toBeNull();
    expect(parseAppliedDate(null, NOW)).toBeNull();
    expect(parseAppliedDate('1999-01-01', NOW)).toBeNull();
  });
  test('today is allowed', () => {
    expect(parseAppliedDate('2026-10-21', NOW)).toEqual(new Date(2026, 9, 21));
  });
});

describe('safeHttpUrl', () => {
  test('only http(s) links pass', () => {
    expect(safeHttpUrl('https://a.b/c')).toBe('https://a.b/c');
    expect(safeHttpUrl(' http://a.b ')).toBe('http://a.b');
    expect(safeHttpUrl('javascript:alert(1)')).toBe('');
    expect(safeHttpUrl('data:text/html,x')).toBe('');
    expect(safeHttpUrl('')).toBe('');
    expect(safeHttpUrl(undefined)).toBe('');
  });
});

describe('computeAnalytics: empty input', () => {
  test('returns zeros and nulls, never NaN', () => {
    const a = computeAnalytics([], NOW);
    expect(a.total).toBe(0);
    expect(a.applied).toBe(0);
    expect(a.responseRate).toBeNull();
    expect(a.avgPerWeek).toBeNull();
    expect(a.weeks).toHaveLength(WEEKS_SHOWN);
    expect(a.funnel.every((s) => Number.isFinite(s.n) && Number.isFinite(s.shareOfTotal))).toBe(true);
    expect(buildSummary(a)).toEqual([]);
    expect(computeAnalytics(undefined, NOW).total).toBe(0);
  });
});

describe('computeAnalytics: funnel', () => {
  const jobs = [
    job('Not Applied'), job('Not Applied'),
    job('Applied'), job('Applied'), job('Applied'),
    job('Interview'), job('Interview'),
    job('Offer'),
    job('Rejected'), job('Rejected'),
    job('Withdrawn'),                                   // never applied: not counted as applied
    job('Withdrawn', { date_applied: ago(10) }),        // applied, then withdrew
  ];
  const a = computeAnalytics(jobs, NOW);

  test('applied includes jobs that moved on, so later stages never exceed earlier ones', () => {
    expect(a.total).toBe(12);
    expect(a.applied).toBe(3 + 2 + 1 + 2 + 1); // Applied, Interview, Offer, Rejected, dated Withdrawn
    expect(a.reached).toBe(3);                  // Interview + Offer
    expect(a.offers).toBe(1);
    const n = a.funnel.map((s) => s.n);
    expect(n).toEqual([12, 9, 3, 1]);
    expect(n[0] >= n[1] && n[1] >= n[2] && n[2] >= n[3]).toBe(true);
  });
  test('step conversion is relative to the previous stage', () => {
    expect(a.funnel.map((s) => s.pctOfPrev)).toEqual([null, 75, 33, 33]);
  });
  test('response rate counts interviews, offers and rejections over applied', () => {
    expect(a.replied).toBe(5);
    expect(a.responseRate).toBe(Math.round((5 / 9) * 100));
    expect(a.awaiting).toBe(3);
  });
  test('status bar covers every job exactly once', () => {
    expect(a.statusBar.reduce((s, x) => s + x.n, 0)).toBe(a.total);
    expect(a.statusBar.map((x) => x.status)).toEqual(['Not Applied', 'Applied', 'Interview', 'Offer', 'Withdrawn', 'Rejected']);
  });
});

describe('computeAnalytics: weekly activity', () => {
  test('buckets by Monday-start weeks and flags the current week', () => {
    const a = computeAnalytics(
      [
        job('Applied', { date_applied: ago(0) }),  // Wed 21 Oct: current week
        job('Applied', { date_applied: ago(2) }),  // Mon 19 Oct: still current week
        job('Applied', { date_applied: ago(3) }),  // Sun 18 Oct: previous week
        job('Applied', { date_applied: ago(9) }),  // Mon 12 Oct: previous week (Mon 12 to Sun 18)
        job('Applied', { date_applied: ago(10) }), // Sun 11 Oct: two weeks back
      ],
      NOW
    );
    expect(a.weeks).toHaveLength(WEEKS_SHOWN);
    expect(a.weeks[WEEKS_SHOWN - 1]).toMatchObject({ n: 2, current: true });
    expect(a.weeks[WEEKS_SHOWN - 1].start).toEqual(new Date(2026, 9, 19));
    expect(a.weeks[WEEKS_SHOWN - 2].n).toBe(2);
    expect(a.weeks[WEEKS_SHOWN - 3].n).toBe(1);
    expect(a.weeks.filter((w) => w.current)).toHaveLength(1);
    expect(a.weeksTotal).toBe(5);
  });
  test('old applications still count as applied but fall outside the chart', () => {
    const a = computeAnalytics([job('Applied', { date_applied: ago(400) })], NOW);
    expect(a.applied).toBe(1);
    expect(a.weeksTotal).toBe(0);
    expect(a.undatedApplied).toBe(0);
  });
  test('applied jobs with no usable date are disclosed, not guessed', () => {
    const a = computeAnalytics([job('Applied'), job('Interview', { date_applied: 'last Tuesday' }), job('Applied', { date_applied: ago(1) })], NOW);
    expect(a.applied).toBe(3);
    expect(a.undatedApplied).toBe(2);
    expect(a.weeksTotal).toBe(1);
    expect(a.awaitingUndated).toBe(1);
  });
  test('30-day windows have exact edges', () => {
    const a = computeAnalytics(
      [29, 30, 59, 60].map((d) => job('Applied', { date_applied: ago(d) })),
      NOW
    );
    expect(a.last30).toBe(1);  // 29 days ago
    expect(a.prev30).toBe(2);  // 30 and 59 days ago
  });
  test('average runs over completed weeks since the first active one', () => {
    // 15 and 16 days ago are Tue 6 and Mon 5 Oct (week of Mon 5 Oct).
    // 9, 8, 7 and 5 days ago are Mon 12 to Fri 16 Oct (week of Mon 12 Oct).
    const a = computeAnalytics(
      [
        ...[15, 16].map((d) => job('Applied', { date_applied: ago(d) })),       // week of Mon 5 Oct
        ...[9, 8, 7, 5].map((d) => job('Applied', { date_applied: ago(d) })),   // week of Mon 12 Oct
        job('Applied', { date_applied: ago(0) }),                               // current week: excluded from the average
      ],
      NOW
    );
    // Completed weeks from the first active one (Mon 5 Oct): 5 Oct and 12 Oct = 2 weeks, 6 applications
    expect(a.avgPerWeek).toBe(3);
  });
  test('average is null when only the current week has activity', () => {
    expect(computeAnalytics([job('Applied', { date_applied: ago(0) })], NOW).avgPerWeek).toBeNull();
  });
});

describe('computeAnalytics: follow-ups', () => {
  test('lists only dated Applied jobs waiting 14+ days, oldest first', () => {
    const a = computeAnalytics(
      [
        job('Applied', { company: 'New', date_applied: ago(13) }),
        job('Applied', { company: 'Edge', date_applied: ago(14) }),
        job('Applied', { company: 'Old', date_applied: ago(40) }),
        job('Interview', { company: 'Moved', date_applied: ago(40) }),
        job('Applied', { company: 'Undated' }),
      ],
      NOW
    );
    expect(a.followUps.map((f) => [f.job.company, f.days])).toEqual([['Old', 40], ['Edge', 14]]);
    expect(a.awaitingUndated).toBe(1);
  });
});

describe('computeAnalytics: resume versions', () => {
  test('groups trimmed versions among applied jobs and reports the unversioned rest', () => {
    const a = computeAnalytics(
      [
        job('Interview', { resume_version: 'v2' }),
        job('Applied', { resume_version: ' v2 ' }),
        job('Offer', { resume_version: 'v2' }),
        job('Rejected', { resume_version: 'v1' }),
        job('Applied'),
        job('Not Applied', { resume_version: 'v9' }), // never applied: ignored
      ],
      NOW
    );
    const { rows, missing } = a.groups.resume;
    expect(missing).toBe(1);
    expect(rows.map((r) => r.name)).toEqual(['v2', 'v1']);
    expect(rows[0]).toMatchObject({ applied: 3, replied: 2, interviews: 2, offers: 1, replyRate: 67, interviewRate: 67, smallSample: true });
    expect(rows[1]).toMatchObject({ applied: 1, replied: 1, interviews: 0, interviewRate: 0, replyRate: 100 });
  });
  test('five applications is no longer a small sample', () => {
    const a = computeAnalytics(Array.from({ length: 5 }, () => job('Applied', { resume_version: 'v1' })), NOW);
    expect(a.groups.resume.rows[0].smallSample).toBe(false);
  });
});

describe('buildSummary', () => {
  test('nothing applied yet', () => {
    expect(text(buildSummary(computeAnalytics([job('Not Applied')], NOW)))).toBe("You're tracking 1 job but haven't applied to any yet.");
    expect(text(buildSummary(computeAnalytics([job('Not Applied'), job('Not Applied')], NOW)))).toBe("You're tracking 2 jobs but haven't applied to any yet.");
  });
  test('trend up, replies, follow-ups and offers', () => {
    const jobs = [
      ...[1, 2, 3].map((d) => job('Applied', { date_applied: ago(d) })),
      job('Applied', { date_applied: ago(20) }),
      job('Applied', { date_applied: ago(35) }),
      job('Interview', { date_applied: ago(40) }),
      job('Offer', { date_applied: ago(50) }),
    ];
    const a = computeAnalytics(jobs, NOW);
    expect(text(buildSummary(a))).toBe(
      '7 applications so far, 4 in the last 30 days (up from 3 the month before). 2 of 7 have replied. 2 applications have been waiting 14+ days for a reply. 1 offer received.'
    );
  });
  test('trend down, level, and none', () => {
    const mk = (recent, before) => computeAnalytics([
      ...Array.from({ length: recent }, () => job('Applied', { date_applied: ago(5) })),
      ...Array.from({ length: before }, () => job('Applied', { date_applied: ago(40) })),
    ], NOW);
    expect(text(buildSummary(mk(1, 3)))).toContain('1 in the last 30 days (down from 3 the month before)');
    expect(text(buildSummary(mk(2, 2)))).toContain('(level with the month before)');
    expect(text(buildSummary(mk(2, 0)))).toContain('(none the month before)');
    expect(text(buildSummary(mk(0, 2)))).toContain('2 applications so far, none in the last 30 days.');
  });
  test('no replies yet; singular wording', () => {
    const a = computeAnalytics([job('Applied', { date_applied: ago(2) })], NOW);
    expect(text(buildSummary(a))).toBe('1 application so far, 1 in the last 30 days (none the month before). No replies yet.');
  });
  test('bolds the numbers', () => {
    const a = computeAnalytics([job('Applied', { date_applied: ago(2) })], NOW);
    const strong = buildSummary(a).flatMap((s) => s.parts).filter((p) => p.strong).map((p) => p.text);
    expect(strong).toEqual(['1', '1']);
  });
});

describe('sourceOf', () => {
  test('recognises common job sites and falls back to company site', () => {
    expect(sourceOf({ jd_link: 'https://www.linkedin.com/jobs/view/123/' })).toBe('LinkedIn');
    expect(sourceOf({ jd_link: 'https://boards.greenhouse.io/acme/jobs/1' })).toBe('Greenhouse');
    expect(sourceOf({ jd_link: 'https://job-boards.greenhouse.io/acme/jobs/1' })).toBe('Greenhouse');
    expect(sourceOf({ jd_link: 'https://jobs.lever.co/acme/abc' })).toBe('Lever');
    expect(sourceOf({ jd_link: 'https://wellfound.com/jobs/1' })).toBe('Wellfound');
    expect(sourceOf({ jd_link: 'https://acme.wd5.myworkdayjobs.com/en-US/x' })).toBe('Workday');
    expect(sourceOf({ jd_link: 'https://careers.acme.com/job/42' })).toBe('Company site');
  });
  test('no link, unsafe link or garbage gives no source', () => {
    expect(sourceOf({ jd_link: '' })).toBe('');
    expect(sourceOf({ jd_link: 'javascript:alert(1)' })).toBe('');
    expect(sourceOf({ jd_link: 'not a url' })).toBe('');
    expect(sourceOf({})).toBe('');
    expect(sourceOf(undefined)).toBe('');
  });
  test('a lookalike host is not mistaken for LinkedIn', () => {
    expect(sourceOf({ jd_link: 'https://notlinkedin.com/x' })).toBe('Company site');
    expect(sourceOf({ jd_link: 'https://linkedin.com.evil.io/x' })).toBe('Company site');
  });
});

describe('workModeOf', () => {
  test('reads Remote, Hybrid and On-site from location and role', () => {
    expect(workModeOf({ location: 'Remote - US', role: 'Engineer' })).toBe('Remote');
    expect(workModeOf({ location: 'Berlin (Hybrid)', role: 'Engineer' })).toBe('Hybrid');
    expect(workModeOf({ location: 'Berlin', role: 'Engineer' })).toBe('On-site');
    expect(workModeOf({ location: '', role: 'Engineer (Remote)' })).toBe('Remote');
    expect(workModeOf({ location: '', role: 'Engineer' })).toBe('');
    expect(workModeOf({ location: 'Remoteville, TX', role: 'Engineer' })).toBe('On-site'); // whole word only
    expect(workModeOf(undefined)).toBe('');
  });
});

describe('computeAnalytics: flow', () => {
  const a = computeAnalytics(
    [
      job('Not Applied'), job('Not Applied'), job('Not Applied'),
      job('Withdrawn'),                                // dropped before applying
      job('Withdrawn', { date_applied: ago(9) }),      // withdrew after applying
      job('Applied'), job('Applied'),
      job('Interview'), job('Offer'),
      job('Rejected'), job('Rejected'), job('Rejected'),
    ],
    NOW
  );
  test('both levels of the flow add up exactly', () => {
    const f = a.flow;
    expect(f.total).toBe(12);
    expect(f.total).toBe(f.applied + f.notApplied + f.droppedBefore);
    expect(f.applied).toBe(f.awaiting + f.interview + f.offer + f.rejected + f.withdrewAfter);
    expect(f).toMatchObject({ applied: 8, notApplied: 3, droppedBefore: 1, awaiting: 2, interview: 1, offer: 1, rejected: 3, withdrewAfter: 1 });
  });
});

describe('computeAnalytics: habits', () => {
  test('finds the strongest weekday only when it is clear and there is enough data', () => {
    const tuesdays = [1, 8, 15, 22]; // Tue 20 Oct and the Tuesdays before it
    const mondays = [2, 9];
    const wednesdays = [0, 7];
    const a = computeAnalytics([...tuesdays, ...mondays, ...wednesdays].map((d) => job('Applied', { date_applied: ago(d) })), NOW);
    expect(a.weekdays).toEqual([2, 4, 2, 0, 0, 0, 0]);
    expect(a.bestWeekday).toEqual({ index: 1, name: 'Tuesday', n: 4 });
  });
  test('a tie, or fewer than 8 dated applications, claims nothing', () => {
    const tie = computeAnalytics([1, 8, 15, 2, 9, 16, 0, 7].map((d) => job('Applied', { date_applied: ago(d) })), NOW);
    expect(tie.weekdays.slice(0, 3)).toEqual([3, 3, 2]);
    expect(tie.bestWeekday).toBeNull();
    const few = computeAnalytics([1, 8, 15].map((d) => job('Applied', { date_applied: ago(d) })), NOW);
    expect(few.bestWeekday).toBeNull();
  });
  test('calendar is 26 Monday-first weeks ending this week, with future days empty', () => {
    const a = computeAnalytics(
      [0, 0, 1, 30, 400].map((d) => job('Applied', { date_applied: ago(d) })),
      NOW
    );
    expect(a.heatmap).toHaveLength(HEAT_WEEKS);
    expect(a.heatmap.every((w) => w.length === 7)).toBe(true);
    expect(a.heatmap[0][0].date.getDay()).toBe(1); // a Monday
    const lastWeek = a.heatmap[HEAT_WEEKS - 1];
    expect(lastWeek[0].date).toEqual(new Date(2026, 9, 19));
    expect(lastWeek.map((c) => c.future)).toEqual([false, false, false, true, true, true, true]);
    expect(lastWeek[1].n).toBe(1);  // Tue 20 Oct
    expect(lastWeek[2].n).toBe(2);  // Wed 21 Oct, two applications
    expect(a.heatmapTotal).toBe(4); // the 400-day-old one is off the calendar
    expect(a.heatmapMax).toBe(2);
    expect(a.applied).toBe(5);
  });
});

describe('computeAnalytics: what is working', () => {
  test('sources are grouped, skip link-less jobs, and fold the tail into Other', () => {
    const hosts = ['linkedin.com', 'boards.greenhouse.io', 'jobs.lever.co', 'wellfound.com', 'indeed.com', 'jobs.ashbyhq.com', 'smartrecruiters.com', 'careers.acme.com'];
    const jobs = hosts.map((h, i) => job(i === 0 ? 'Interview' : 'Applied', { jd_link: `https://${h}/x` }));
    jobs.push(job('Applied', { jd_link: 'https://www.linkedin.com/y' }), job('Applied')); // 2nd LinkedIn, plus no link
    const { rows, missing } = computeAnalytics(jobs, NOW).groups.source;
    expect(missing).toBe(1);
    expect(rows).toHaveLength(6);
    expect(rows[0]).toMatchObject({ name: 'LinkedIn', applied: 2, replied: 1, interviews: 1, replyRate: 50 });
    expect(rows[rows.length - 1].name).toBe('Other');
    expect(rows.reduce((sum, r) => sum + r.applied, 0)).toBe(9); // nothing lost in the merge
  });
  test('work mode compares remote, hybrid and on-site', () => {
    const { rows } = computeAnalytics(
      [
        job('Interview', { location: 'Remote' }), job('Applied', { location: 'Remote' }),
        job('Rejected', { location: 'Berlin' }),
        job('Applied', { location: 'Berlin (Hybrid)' }),
        job('Applied', { location: '', role: 'Engineer' }),
      ],
      NOW
    ).groups.mode;
    expect(rows.map((r) => [r.name, r.applied, r.replyRate])).toEqual([
      ['Remote', 2, 50], ['Hybrid', 1, 0], ['On-site', 1, 100],
    ]);
  });
});

describe('computeAnalytics: saved jobs going cold', () => {
  test('lists Not Applied jobs saved 14+ days ago, oldest first', () => {
    const a = computeAnalytics(
      [
        job('Not Applied', { company: 'Fresh', created_at: `${ago(13)}T10:00:00.123456` }),
        job('Not Applied', { company: 'Edge', created_at: `${ago(14)}T10:00:00` }),
        job('Not Applied', { company: 'Old', created_at: `${ago(90)}T08:00:00` }),
        job('Not Applied', { company: 'Undated' }),
        job('Applied', { company: 'Applied', created_at: `${ago(90)}T08:00:00` }),
      ],
      NOW
    );
    expect(a.saved).toBe(4);
    expect(a.cold.map((c) => [c.job.company, c.days])).toEqual([['Old', 90], ['Edge', 14]]);
  });
});

describe('weekly goal', () => {
  const apps = [
    ...[0, 1, 2],             // this week: 3
    ...[3, 4, 5, 6, 7],       // week of Mon 12 Oct: 5
    ...[10, 11, 12, 13, 14],  // week of Mon 5 Oct: 5
    ...[17, 18],              // week of Mon 28 Sep: 2
    ...[24, 25, 26, 27, 28],  // week of Mon 21 Sep: 5
  ].map((d) => job('Applied', { date_applied: ago(d) }));
  const a = computeAnalytics(apps, NOW);

  test('averages and best week', () => {
    expect(a.avgPerWeek).toBe(4.25);
    expect(a.avgLast4).toBe(4.25);
    expect(a.bestWeek.n).toBe(5);
    expect(a.bestWeek.start).toEqual(new Date(2026, 9, 12)); // ties go to the most recent week
  });
  test('goal of 5: unfinished week does not break the streak', () => {
    expect(goalStats(a.weeks, 5)).toEqual({ goal: 5, currentN: 3, currentPct: 60, metWeeks: 3, consideredWeeks: 4, streak: 2 });
  });
  test('goal of 3: the current week counts once it is met', () => {
    expect(goalStats(a.weeks, 3)).toEqual({ goal: 3, currentN: 3, currentPct: 100, metWeeks: 3, consideredWeeks: 4, streak: 3 });
  });
  test('bad goals are clamped', () => {
    expect(goalStats(a.weeks, 0).goal).toBe(1);
    expect(goalStats(a.weeks, 'abc').goal).toBe(1);
    expect(goalStats(a.weeks, '5').goal).toBe(5);
    expect(goalStats(a.weeks, 4.9).goal).toBe(4);
    expect(goalStats(a.weeks, 100).currentPct).toBe(3);
  });
  test('no history: nothing considered, no streak', () => {
    const empty = computeAnalytics([], NOW);
    expect(goalStats(empty.weeks, 5)).toMatchObject({ metWeeks: 0, consideredWeeks: 0, streak: 0, currentPct: 0 });
  });
});
