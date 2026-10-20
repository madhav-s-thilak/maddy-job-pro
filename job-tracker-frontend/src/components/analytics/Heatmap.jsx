import React from 'react';
import { HEAT } from './primitives';

const fmtDate = (d) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const level = (n) => (n <= 0 ? 0 : Math.min(4, n));
const DAY_LABELS = { 0: 'Mon', 2: 'Wed', 4: 'Fri' };

/** A calendar of the last weeks: one square per day, darker for more applications. */
export const Heatmap = ({ weeks, total }) => {
  // Label the column where a month starts, dropping a label that would crowd the next one.
  const starts = weeks
    .map((week, i) => ({ i, month: week[0].date.getMonth(), text: week[0].date.toLocaleDateString(undefined, { month: 'short' }) }))
    .filter((c, i, all) => i === 0 || all[i - 1].month !== c.month);
  const months = starts.filter((c, k) => k === starts.length - 1 || starts[k + 1].i - c.i >= 3);

  return (
    <div>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `28px repeat(${weeks.length}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`Calendar of ${total} applications over the last ${weeks.length} weeks`}
      >
        {months.map(({ i, text }) => (
          <span key={`m${i}`} className="text-[11px] text-slate-500 leading-none pb-1 whitespace-nowrap" style={{ gridColumn: `${i + 2} / span ${Math.min(3, weeks.length - i)}`, gridRow: 1 }}>
            {text}
          </span>
        ))}
        {Object.entries(DAY_LABELS).map(([row, label]) => (
          <span key={label} className="text-[11px] text-slate-500 flex items-center" style={{ gridColumn: 1, gridRow: Number(row) + 2 }}>
            {label}
          </span>
        ))}
        {weeks.map((week, w) =>
          week.map((cell, d) =>
            cell.future ? null : (
              <div
                key={`${w}-${d}`}
                title={`${fmtDate(cell.date)}: ${cell.n} ${cell.n === 1 ? 'application' : 'applications'}`}
                className="aspect-square rounded-[3px] hover:ring-2 hover:ring-slate-400/50 hover:ring-offset-1"
                style={{ gridColumn: w + 2, gridRow: d + 2, background: HEAT[level(cell.n)] }}
              />
            )
          )
        )}
      </div>
      <div className="mt-4 flex items-center justify-end gap-1.5 text-[11px] text-slate-500" aria-hidden="true">
        <span>Less</span>
        {HEAT.map((c) => (
          <span key={c} className="w-3 h-3 rounded-[3px]" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};
