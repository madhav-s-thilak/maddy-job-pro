// Geometry for the "where did my jobs go" flow diagram (a two-step Sankey).
// Pure maths: the component only draws what this returns.
//
//   Tracked  ->  Applied | Not applied yet | Dropped before applying
//   Applied  ->  Offer | Interview | Awaiting reply | Rejected | Withdrew

export const FLOW_W = 640;
export const FLOW_H = 340;
export const NODE_W = 12;
const PAD_Y = 8;
const GAP = 16;
const MIN_NODE_H = 3;
const COL_X = [0, 240, 480];

const COL1 = [
  ['applied', 'Applied', 'applied'],
  ['notApplied', 'Not applied yet', 'notApplied'],
  ['dropped', 'Dropped before applying', 'droppedBefore'],
];
const COL2 = [
  ['offer', 'Offer', 'offer'],
  ['interview', 'Interview', 'interview'],
  ['awaiting', 'Awaiting reply', 'awaiting'],
  ['rejected', 'Rejected', 'rejected'],
  ['withdrew', 'Withdrew', 'withdrewAfter'],
];

const ribbon = (x0, y0, x1, y1, h) => {
  const mid = (x0 + x1) / 2;
  return (
    `M${x0},${y0} C${mid},${y0} ${mid},${y1} ${x1},${y1} ` +
    `L${x1},${y1 + h} C${mid},${y1 + h} ${mid},${y0 + h} ${x0},${y0 + h} Z`
  );
};

export function layoutFlow(flow, W = FLOW_W, H = FLOW_H) {
  if (!flow || flow.total <= 0) return { nodes: [], links: [] };

  const pick = (spec) =>
    spec.map(([key, label, field]) => ({ key, label, n: flow[field] })).filter((n) => n.n > 0);
  const col1 = pick(COL1);
  const col2 = pick(COL2);

  // One scale for the whole diagram so a job is the same height in every column.
  const room = H - 2 * PAD_Y;
  const scale = Math.min(
    room / flow.total,
    (room - (col1.length - 1) * GAP) / flow.total,
    col2.length ? (room - (col2.length - 1) * GAP) / flow.applied : Infinity
  );
  const heightOf = (n) => Math.max(MIN_NODE_H, n * scale);

  const nodes = [];
  const rootH = heightOf(flow.total);
  const root = { key: 'tracked', label: 'Tracked', n: flow.total, col: 0, x: COL_X[0], y: (H - rootH) / 2, h: rootH };
  nodes.push(root);

  const stack = (items, col, top) => {
    let y = top;
    return items.map((item) => {
      const node = { ...item, col, x: COL_X[col], y, h: heightOf(item.n) };
      y += node.h + GAP;
      nodes.push(node);
      return node;
    });
  };
  const stackHeight = (items) => items.reduce((s, i) => s + heightOf(i.n), 0) + Math.max(0, items.length - 1) * GAP;

  const placed1 = stack(col1, 1, (H - stackHeight(col1)) / 2);
  const appliedNode = placed1.find((n) => n.key === 'applied');
  let placed2 = [];
  if (appliedNode && col2.length) {
    const h2 = stackHeight(col2);
    const centre = appliedNode.y + appliedNode.h / 2;
    placed2 = stack(col2, 2, Math.min(Math.max(centre - h2 / 2, PAD_Y), H - PAD_Y - h2));
  }

  const links = [];
  const flowOut = (source, targets) => {
    let offset = 0;
    targets.forEach((target) => {
      const h = target.n * scale;
      links.push({
        key: `${source.key}-${target.key}`,
        source: source.key,
        target: target.key,
        n: target.n,
        d: ribbon(source.x + NODE_W, source.y + offset, target.x, target.y, h),
      });
      offset += h;
    });
  };
  flowOut(root, placed1);
  if (appliedNode) flowOut(appliedNode, placed2);

  return { nodes, links };
}
