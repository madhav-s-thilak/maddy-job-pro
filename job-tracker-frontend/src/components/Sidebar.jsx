import React from 'react';
import {
  Briefcase, BarChart2, Sparkles, Target,
  TrendingUp, Brain, Github, Globe,
  Zap, ChevronLeft, ChevronRight
} from 'lucide-react';

const NAV = [
  {
    group: 'Workspace',
    items: [
      { id: 'jobs',      label: 'Job Tracker',     icon: Briefcase,  color: 'blue'    },
      { id: 'analytics', label: 'Analytics',        icon: BarChart2,  color: 'purple'  },
      { id: 'bestmatch', label: 'AI Best Match',    icon: Sparkles,   color: 'emerald' },
    ],
  },
  {
    group: 'AI Intelligence',
    items: [
      { id: 'ats',       label: 'ATS Simulator',    icon: Target,     color: 'orange'  },
      { id: 'gaps',      label: 'Skill Gap',         icon: TrendingUp, color: 'amber'   },
      { id: 'compiler',  label: 'Resume Compiler',   icon: Brain,      color: 'violet'  },
      { id: 'portfolio', label: 'Portfolio Critic',  icon: Github,     color: 'rose'    },
    ],
  },
  {
    group: 'Tools',
    items: [
      { id: 'extension', label: 'Browser Extension', icon: Globe,      color: 'sky'     },
    ],
  },
];

const C = {
  blue:    { icon: 'text-blue-400',    bg: 'bg-blue-500/20',    border: 'border-blue-500',    text: 'text-blue-300',    dot: 'bg-blue-400'    },
  purple:  { icon: 'text-purple-400',  bg: 'bg-purple-500/20',  border: 'border-purple-500',  text: 'text-purple-300',  dot: 'bg-purple-400'  },
  emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  orange:  { icon: 'text-orange-400',  bg: 'bg-orange-500/20',  border: 'border-orange-500',  text: 'text-orange-300',  dot: 'bg-orange-400'  },
  amber:   { icon: 'text-amber-400',   bg: 'bg-amber-500/20',   border: 'border-amber-500',   text: 'text-amber-300',   dot: 'bg-amber-400'   },
  violet:  { icon: 'text-violet-400',  bg: 'bg-violet-500/20',  border: 'border-violet-500',  text: 'text-violet-300',  dot: 'bg-violet-400'  },
  rose:    { icon: 'text-rose-400',    bg: 'bg-rose-500/20',    border: 'border-rose-500',    text: 'text-rose-300',    dot: 'bg-rose-400'    },
  sky:     { icon: 'text-sky-400',     bg: 'bg-sky-500/20',     border: 'border-sky-500',     text: 'text-sky-300',     dot: 'bg-sky-400'     },
};

// ---------------------------------------------------------------------------
// NavItem — renders icon-only when collapsed, icon+label when expanded
// ---------------------------------------------------------------------------
const NavItem = ({ item, active, collapsed, onClick }) => {
  const Icon = item.icon;
  const c = C[item.color];

  return (
    <button
      title={collapsed ? item.label : undefined}
      onClick={() => onClick(item.id)}
      className={`
        w-full flex items-center rounded-lg text-sm transition-all duration-200
        border-l-2 group relative
        ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
        ${active
          ? `${c.bg} ${c.border} ${c.text} font-medium`
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }
      `}
    >
      <Icon
        size={17}
        className={active ? c.icon : 'text-slate-500 group-hover:text-slate-300'}
        strokeWidth={active ? 2.5 : 2}
      />

      {/* Label — hidden when collapsed */}
      {!collapsed && (
        <span className="flex-1 text-left leading-snug truncate">{item.label}</span>
      )}

      {/* Active dot — only in expanded mode */}
      {!collapsed && active && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      )}

      {/* Tooltip for collapsed mode */}
      {collapsed && (
        <span className="
          absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs
          rounded-lg whitespace-nowrap pointer-events-none
          opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50
          border border-white/10 shadow-xl
        ">
          {item.label}
        </span>
      )}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
const Sidebar = ({ activeView, onViewChange, collapsed, onToggle }) => (
  <aside
    className="shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out"
    style={{
      width: collapsed ? '60px' : '224px',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
    }}
  >
    {/* ── Brand ──────────────────────────────────────────────────────────── */}
    <div className={`border-b border-white/10 transition-all duration-300 ${collapsed ? 'px-2 py-4' : 'px-5 py-5'}`}>
      {collapsed ? (
        /* Collapsed: just the logo icon, centred */
        <div className="flex justify-center">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)' }}
            onClick={onToggle}
            title="Expand sidebar"
          >
            <Zap size={18} className="text-white" strokeWidth={2.5} />
          </div>
        </div>
      ) : (
        /* Expanded: logo + name */
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)' }}
          >
            <Zap size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[15px] font-bold leading-tight whitespace-nowrap">
              <span className="text-white">Maddy</span>
              {' '}
              <span style={{
                background: 'linear-gradient(90deg, #818cf8, #38bdf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Job Pro
              </span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 tracking-wide whitespace-nowrap">
              AI Career Platform
            </p>
          </div>
        </div>
      )}
    </div>

    {/* ── Toggle button ───────────────────────────────────────────────────── */}
    {!collapsed && (
      <div className="flex justify-end px-3 pt-3">
        <button
          onClick={onToggle}
          title="Collapse sidebar"
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-colors"
        >
          <ChevronLeft size={14} className="text-slate-400" />
        </button>
      </div>
    )}

    {/* ── Navigation ─────────────────────────────────────────────────────── */}
    <nav className={`flex-1 py-3 space-y-4 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-1.5' : 'px-3'}`}>
      {NAV.map(section => (
        <div key={section.group}>
          {/* Group label — hidden when collapsed */}
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              {section.group}
            </p>
          )}
          {collapsed && <div className="h-px bg-white/5 mx-1 mb-2" />}

          <div className="space-y-0.5">
            {section.items.map(item => (
              <NavItem
                key={item.id}
                item={item}
                active={activeView === item.id}
                collapsed={collapsed}
                onClick={onViewChange}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>

    {/* ── Footer ─────────────────────────────────────────────────────────── */}
    <div className={`border-t border-white/10 transition-all duration-300 ${collapsed ? 'px-2 py-3' : 'px-5 py-4'}`}>
      {collapsed ? (
        /* Collapsed: expand icon at the bottom */
        <button
          onClick={onToggle}
          title="Expand sidebar"
          className="w-full flex justify-center"
        >
          <ChevronRight size={15} className="text-slate-600 hover:text-slate-400 transition-colors" />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[10px] text-slate-500">Groq · FastAPI · Render</p>
        </div>
      )}
    </div>
  </aside>
);

export default Sidebar;
