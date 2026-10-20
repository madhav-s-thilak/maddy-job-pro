import React from 'react';

// One blue ramp for the ordered pipeline stages (validated as an ordinal ramp); greys for
// outcomes that are not progress. A colour means the same thing everywhere on the page:
// Applied is always #3987e5.
export const RAMP = { tracked: '#86b6ef', applied: '#3987e5', interview: '#1c5cab', offer: '#0d366b' };
export const NEUTRAL = { saved: '#cbd5e1', awaiting: '#94a3b8', rejected: '#475569' };
// Calendar intensity: 0, 1, 2, 3, 4+ applications in a day (sequential, one hue).
export const HEAT = ['#f1f5f9', '#cde2fb', '#86b6ef', '#3987e5', '#1c5cab'];
export const GRID = '#e2e8f0';
export const AXIS_TEXT = '#64748b';

export const Card = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`w-full bg-white border border-slate-200 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] print:shadow-none break-inside-avoid ${className}`}>
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-6 pt-6">
      <div className="min-w-0 max-w-full">
        <h2 className="text-base font-semibold text-slate-900 leading-snug">{title}</h2>
        {subtitle && <p className="text-[13px] text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </header>
    <div className="px-6 pb-6 pt-5">{children}</div>
  </section>
);

export const Empty = ({ children, className = '' }) => (
  <p className={`text-[13px] text-slate-500 leading-relaxed ${className}`}>{children}</p>
);

export const Segmented = ({ value, onChange, options, label }) => (
  <div role="tablist" aria-label={label} className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 text-[13px] print:hidden">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="tab"
        aria-selected={value === o.value}
        onClick={() => onChange(o.value)}
        className={`px-2.5 py-1 rounded-md transition-colors ${
          value === o.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

// Completed weeks only: the current week is unfinished and would draw a false dip.
export const Sparkline = ({ values, label }) => {
  const W = 96;
  const H = 30;
  const PAD = 4;
  const max = Math.max(1, ...values);
  const step = (W - PAD * 2) / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [PAD + i * step, H - PAD - (v / max) * (H - PAD * 2)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="shrink-0">
      <path d={d} fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="4" fill={RAMP.applied} stroke="#ffffff" strokeWidth="2" />
    </svg>
  );
};

/** A slim progress bar: the track is a lighter step of the fill's own ramp. */
export const Meter = ({ value, label }) => (
  <div
    role="meter"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={value}
    aria-label={label}
    className="h-1.5 rounded-full bg-[#cde2fb] overflow-hidden"
  >
    <div className="h-full rounded-full" style={{ width: `${value}%`, background: value >= 100 ? RAMP.offer : RAMP.applied }} />
  </div>
);
