import { computeAnalytics } from './analytics';
import { layoutFlow, FLOW_H, FLOW_W, NODE_W } from './flowLayout';

const job = (status, extra = {}) => ({ company: 'A', role: 'B', status, date_applied: '', ...extra });
const NOW = new Date(2026, 9, 21);
const flowOf = (jobs) => computeAnalytics(jobs, NOW).flow;
const many = (n, status, extra) => Array.from({ length: n }, () => job(status, extra));

const sample = flowOf([
  ...many(11, 'Not Applied'), ...many(1, 'Withdrawn'), ...many(2, 'Withdrawn', { date_applied: '2026-10-01' }),
  ...many(21, 'Applied'), ...many(7, 'Interview'), ...many(2, 'Offer'), ...many(13, 'Rejected'),
]);

describe('layoutFlow', () => {
  test('empty input draws nothing', () => {
    expect(layoutFlow(flowOf([]))).toEqual({ nodes: [], links: [] });
    expect(layoutFlow(undefined)).toEqual({ nodes: [], links: [] });
  });

  test('only non-empty steps get a node, in the intended order', () => {
    const { nodes } = layoutFlow(sample);
    expect(nodes.map((n) => n.key)).toEqual([
      'tracked', 'applied', 'notApplied', 'dropped', 'offer', 'interview', 'awaiting', 'rejected', 'withdrew',
    ]);
    const small = layoutFlow(flowOf([...many(3, 'Applied'), ...many(1, 'Not Applied')]));
    expect(small.nodes.map((n) => n.key)).toEqual(['tracked', 'applied', 'notApplied', 'awaiting']);
  });

  test('every node sits inside the drawing and none overlap within a column', () => {
    const { nodes } = layoutFlow(sample);
    nodes.forEach((n) => {
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.y + n.h).toBeLessThanOrEqual(FLOW_H);
      expect(n.x + NODE_W).toBeLessThanOrEqual(FLOW_W);
    });
    [0, 1, 2].forEach((col) => {
      const inCol = nodes.filter((n) => n.col === col).sort((a, b) => a.y - b.y);
      inCol.slice(1).forEach((n, i) => expect(n.y).toBeGreaterThan(inCol[i].y + inCol[i].h));
    });
  });

  test('a job is the same height everywhere, and ribbons fill their nodes exactly', () => {
    const { nodes, links } = layoutFlow(sample);
    const byKey = Object.fromEntries(nodes.map((n) => [n.key, n]));
    const perJob = byKey.tracked.h / sample.total;
    expect(byKey.applied.h / sample.applied).toBeCloseTo(perJob, 6);
    expect(byKey.rejected.h / sample.rejected).toBeCloseTo(perJob, 6);
    // Ribbons into a node add up to that node's height: nothing is created or lost.
    nodes.filter((n) => n.col > 0).forEach((n) => {
      const into = links.filter((l) => l.target === n.key).reduce((s, l) => s + l.n * perJob, 0);
      expect(into).toBeCloseTo(n.h, 6);
    });
  });

  test('one ribbon per non-root node, each a closed path', () => {
    const { nodes, links } = layoutFlow(sample);
    expect(links).toHaveLength(nodes.length - 1);
    links.forEach((l) => {
      expect(l.d.startsWith('M')).toBe(true);
      expect(l.d.endsWith('Z')).toBe(true);
      expect(l.d).not.toMatch(/NaN|undefined/);
    });
  });

  test('a single tiny node is still visible', () => {
    const { nodes } = layoutFlow(flowOf([...many(200, 'Applied'), ...many(1, 'Offer')]));
    expect(nodes.find((n) => n.key === 'offer').h).toBeGreaterThanOrEqual(3);
  });

  test('everything rejected, nothing else, still lays out', () => {
    const { nodes, links } = layoutFlow(flowOf(many(4, 'Rejected')));
    expect(nodes.map((n) => n.key)).toEqual(['tracked', 'applied', 'rejected']);
    expect(links).toHaveLength(2);
  });
});
