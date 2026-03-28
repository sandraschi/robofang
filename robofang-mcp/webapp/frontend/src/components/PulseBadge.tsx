import React from 'react';
import { cn } from '../utils/cn';

interface PulseBadgeProps {
  status: 'ok' | 'error' | 'warning' | 'idle';
  label?: string;
  className?: string;
}

export const PulseBadge: React.FC<PulseBadgeProps> = ({ status, label, className }) => {
  const statusColors = {
    ok: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    error: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
    warning: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    idle: 'bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]',
  };

  const statusText = {
    ok: 'text-emerald-400',
    error: 'text-rose-400',
    warning: 'text-amber-400',
    idle: 'text-slate-400',
  };

  return (
    <div className={cn("inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10", className)}>
      <div className={cn("w-2 h-2 rounded-full pulse", statusColors[status])} />
      {label && (
        <span className={cn("text-[10px] font-bold uppercase tracking-widest", statusText[status])}>
          {label}
        </span>
      )}
    </div>
  );
};
