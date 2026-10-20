import { computeAnalytics } from './analytics';
import { csvCell, buildCsv, buildJson, exportFilename, downloadFile, isoDay } from './analyticsExport';

const NOW = new Date(2026, 9, 21, 15, 7, 0); // Wed 21 Oct 2026
const ago = (days) => isoDay(new Date(2026, 9, 21 - days));
const job = (status, extra = {}) => ({ company: 'Acme', role: 'Engineer', status, date_applied: '', resume_version: '', jd_link: '', location: '', ...extra });

const sample = () =>
  computeAnalytics(
    [
      job('Applied', { company: 'Stripe, Inc.', role: 'Backend "Platform" Engineer', date_applied: ago(20), jd_link: 'https://boards.greenhouse.io/stripe/jobs/1', resume_version: 'v1', location: 'Remote' }),
      job('Interview', { company: 'Linear', date_applied: ago(5), jd_link: 'https://linkedin.com/jobs/view/9', resume_version: 'v1' }),
      job('Rejected', { company: 'Figma', date_applied: ago(9), resume_version: 'v2' }),
      job('Not Applied', { company: '=HYPERLINK("http://evil.example","click")', created_at: `${ago(30)}T09:00:00`, jd_link: 'javascript:alert(1)' }),
    ],
    NOW
  );

describe('csvCell', () => {
  test('quotes commas, quotes and line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell('plain')).toBe('plain');
  });
  test('defuses spreadsheet formulas in text, but not real numbers', () => {
    expect(csvCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(csvCell('+1 555 0100')).toBe("'+1 555 0100");
    expect(csvCell('-cmd')).toBe("'-cmd");
    expect(csvCell('@user')).toBe("'@user");
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell(48)).toBe('48');
  });
  test('empty values become empty cells', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(NaN)).toBe('');
  });
});

describe('exportFilename', () => {
  test('is safe and dated', () => {
    expect(exportFilename('Madhav', 'csv', NOW)).toBe('job-search-analysis-madhav-2026-10-21.csv');
    expect(exportFilename('../../etc/passwd', 'json', NOW)).toBe('job-search-analysis-etc-passwd-2026-10-21.json');
    expect(exportFilename('', 'csv', NOW)).toBe('job-search-analysis-all-2026-10-21.csv');
  });
});

describe('buildCsv', () => {
  const csv = buildCsv(sample(), { person: 'Madhav', now: NOW });
  test('starts with a BOM, uses CRLF and ends with a newline', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.includes('\r\n')).toBe(true);
    expect(csv.replace(/\r\n/g, '').includes('\n')).toBe(false);
  });
  test('has a header block and every section', () => {
    const lines = csv.slice(1).split('\r\n');
    expect(lines.slice(0, 3)).toEqual(['Job search analysis', 'Person,Madhav', 'Generated,2026-10-21 15:07']);
    ['Overview', 'Where every job went', 'Funnel', 'Status', 'Applications per week', 'Applications by weekday', 'By resume version', 'By source', 'By work mode', 'Waiting on a reply (14+ days)', '"Saved, not applied (14+ days)"'].forEach((title) =>
      expect(lines).toContain(title)
    );
  });
  test('numbers are right', () => {
    expect(csv).toContain('Jobs tracked,4');
    expect(csv).toContain('Applied,3');
    expect(csv).toContain('Replied,2');
    expect(csv).toContain('Reply rate (%),67');
    expect(csv).toContain('v1,2,1,50,1,0');
  });
  test('user text is quoted and formulas are defused', () => {
    expect(csv).toContain('"Stripe, Inc.","Backend ""Platform"" Engineer",' + ago(20) + ',20,https://boards.greenhouse.io/stripe/jobs/1');
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"",""click"")"`);
    expect(csv).not.toMatch(/(^|,|\r\n)=HYPERLINK/);
  });
  test('unsafe links are left out', () => {
    expect(csv).not.toContain('javascript:');
  });
  test('works with no data at all', () => {
    const empty = buildCsv(computeAnalytics([], NOW), { person: '', now: NOW });
    expect(empty).toContain('Person,Everyone');
    expect(empty).toContain('Jobs tracked,0');
  });
});

describe('buildJson', () => {
  const data = JSON.parse(buildJson(sample(), { person: 'Madhav', now: NOW }));
  test('is valid and carries the headline numbers', () => {
    expect(data.person).toBe('Madhav');
    expect(data.overview).toMatchObject({ tracked: 4, applied: 3, replied: 2, replyRatePercent: 67, offers: 0 });
    expect(data.flow.total).toBe(4);
    expect(data.weekly).toHaveLength(12);
    expect(data.weekday).toHaveLength(7);
    expect(typeof data.summary).toBe('string');
  });
  test('lists waiting and cold jobs, with safe links only', () => {
    expect(data.waitingOnReply).toEqual([{ company: 'Stripe, Inc.', role: 'Backend "Platform" Engineer', date: ago(20), days: 20, link: 'https://boards.greenhouse.io/stripe/jobs/1' }]);
    expect(data.savedNotApplied[0]).toMatchObject({ days: 30, link: '' });
  });
});

describe('downloadFile', () => {
  test('creates a named download from the text and cleans up', () => {
    jest.useFakeTimers();
    const urls = [];
    global.URL.createObjectURL = jest.fn((blob) => { urls.push(blob); return 'blob:fake'; });
    global.URL.revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { urls.push(this.download); });
    downloadFile('x.csv', 'text/csv', 'a,b');
    expect(urls[1]).toBe('x.csv');
    expect(urls[0].type).toBe('text/csv;charset=utf-8');
    expect(document.querySelector('a[download]')).toBeNull(); // the temporary link was removed
    jest.advanceTimersByTime(1500);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    click.mockRestore();
    jest.useRealTimers();
  });
});
