import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileJson, ChevronDown } from 'lucide-react';

const ITEMS = [
  { id: 'pdf', label: 'PDF report', hint: 'Print or save as PDF', icon: FileText },
  { id: 'csv', label: 'CSV', hint: 'Opens in Excel or Sheets', icon: FileSpreadsheet },
  { id: 'json', label: 'JSON', hint: 'Raw data', icon: FileJson },
];

/** Export button with a small menu. onExport receives 'pdf' | 'csv' | 'json'. */
export const ExportMenu = ({ onExport, disabled }) => {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => root.current && !root.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (id) => {
    setOpen(false);
    // Let the menu close before the browser's print dialog freezes the page.
    setTimeout(() => onExport(id), 60);
  };

  return (
    <div ref={root} className="relative print:hidden">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
      >
        <Download size={14} />
        Export
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {ITEMS.map(({ id, label, hint, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              onClick={() => choose(id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
            >
              <Icon size={16} className="shrink-0 text-slate-500" />
              <span>
                <span className="block text-[13px] font-medium text-slate-900">{label}</span>
                <span className="block text-xs text-slate-500">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
