import React, { useMemo, useState } from 'react';
import { layoutFlow, FLOW_W, FLOW_H, NODE_W } from '../../lib/flowLayout';
import { RAMP, NEUTRAL } from './primitives';

const NODE_COLOR = {
  tracked: RAMP.tracked,
  applied: RAMP.applied,
  notApplied: NEUTRAL.saved,
  dropped: NEUTRAL.saved,
  offer: RAMP.offer,
  interview: RAMP.interview,
  awaiting: NEUTRAL.awaiting,
  rejected: NEUTRAL.rejected,
  withdrew: NEUTRAL.saved,
};

const plural = (n) => (n === 1 ? 'job' : 'jobs');
const share = (n, whole) => (whole > 0 ? `${Math.round((n / whole) * 100)}%` : '');

/** Where every tracked job went, as a flow from "Tracked" to its outcome. */
export const FlowChart = ({ flow }) => {
  const { nodes, links } = useMemo(() => layoutFlow(flow), [flow]);
  const [hover, setHover] = useState(null); // a node key
  const related = (l) => hover && (l.source === hover || l.target === hover);
  const dimNode = (key) => hover && hover !== key && !links.some((l) => related(l) && (l.source === key || l.target === key));

  const summary = nodes
    .filter((n) => n.col > 0)
    .map((n) => `${n.label} ${n.n}`)
    .join(', ');

  return (
    <svg
      viewBox={`0 0 ${FLOW_W} ${FLOW_H}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Flow of ${flow.total} tracked jobs: ${summary}`}
    >
      <g>
        {links.map((l) => (
          <path
            key={l.key}
            d={l.d}
            fill={NODE_COLOR[l.target]}
            fillOpacity={hover ? (related(l) ? 0.5 : 0.08) : 0.22}
            className="transition-[fill-opacity] duration-150"
          >
            <title>{`${l.n} ${plural(l.n)} to ${nodes.find((n) => n.key === l.target).label}`}</title>
          </path>
        ))}
      </g>
      <g>
        {nodes.map((n) => (
          <rect
            key={n.key}
            x={n.x}
            y={n.y}
            width={NODE_W}
            height={n.h}
            rx="2"
            fill={NODE_COLOR[n.key]}
            opacity={dimNode(n.key) ? 0.35 : 1}
            className="transition-opacity duration-150"
          />
        ))}
      </g>
      <g>
        {nodes.map((n) => (
          <g
            key={n.key}
            onMouseEnter={() => setHover(n.key)}
            onMouseLeave={() => setHover(null)}
            opacity={dimNode(n.key) ? 0.45 : 1}
            className="transition-opacity duration-150 cursor-default"
          >
            <title>{`${n.label}: ${n.n}${n.col === 1 ? ` (${share(n.n, flow.total)} of tracked)` : n.col === 2 ? ` (${share(n.n, flow.applied)} of applied)` : ''}`}</title>
            {/* wide invisible target so hover does not need the 12px bar */}
            <rect x={n.x} y={n.y - 4} width={NODE_W + 150} height={n.h + 8} fill="transparent" />
            <text
              x={n.x + NODE_W + 8}
              y={n.y + n.h / 2}
              dominantBaseline="middle"
              fontSize="13"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              <tspan fill="#334155" fontWeight="500">{n.label}</tspan>
              <tspan dx="6" fill="#0f172a" fontWeight="600">{n.n}</tspan>
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
};


/** The same flow as a table: the readable version on phones, and the accessible twin everywhere. */
export const FlowTable = ({ flow }) => {
  const rows = [
    { label: 'Tracked', n: flow.total, depth: 0, of: null },
    { label: 'Applied', n: flow.applied, depth: 1, of: flow.total },
    { label: 'Offer', n: flow.offer, depth: 2, of: flow.applied },
    { label: 'Interview', n: flow.interview, depth: 2, of: flow.applied },
    { label: 'Awaiting reply', n: flow.awaiting, depth: 2, of: flow.applied },
    { label: 'Rejected', n: flow.rejected, depth: 2, of: flow.applied },
    { label: 'Withdrew after applying', n: flow.withdrewAfter, depth: 2, of: flow.applied },
    { label: 'Not applied yet', n: flow.notApplied, depth: 1, of: flow.total },
    { label: 'Dropped before applying', n: flow.droppedBefore, depth: 1, of: flow.total },
  ].filter((r) => r.depth === 0 || r.n > 0);

  return (
    <table className="w-full text-[13px]">
      <caption className="sr-only">Where every tracked job went</caption>
      <thead>
        <tr className="text-left text-slate-500 border-b border-slate-200">
          <th scope="col" className="py-2 font-medium">Step</th>
          <th scope="col" className="py-2 font-medium text-right">Jobs</th>
          <th scope="col" className="py-2 font-medium text-right w-20">Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b border-slate-100 last:border-0 text-slate-700">
            <td className="py-2" style={{ paddingLeft: `${r.depth * 16}px` }}>
              <span className={r.depth === 0 ? 'font-medium text-slate-900' : ''}>{r.label}</span>
            </td>
            <td className="py-2 text-right tabular-nums font-medium text-slate-900">{r.n}</td>
            <td className="py-2 text-right tabular-nums text-slate-500">{r.of === null ? '' : share(r.n, r.of)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
