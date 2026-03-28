import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';
import { cn } from '../utils/cn';

interface LogEntry {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

interface StreamingConsoleProps {
  logs: LogEntry[];
  className?: string;
}

export const StreamingConsole: React.FC<StreamingConsoleProps> = ({ logs, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const typeColors = {
    info: 'text-slate-400',
    warn: 'text-amber-400',
    error: 'text-rose-400',
    success: 'text-emerald-400',
  };

  return (
    <div className={cn("glass-panel flex flex-col bg-black/40 h-full", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-violet-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Operator Console</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin font-mono text-xs leading-relaxed"
      >
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 group"
            >
              <span className="text-[10px] text-slate-600 shrink-0 font-mono opacity-50 select-none">
                [{log.timestamp}]
              </span>
              <span className={cn("break-all whitespace-pre-wrap", typeColors[log.type])}>
                {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {logs.length === 0 && (
          <div className="flex items-center justify-center h-full opacity-20 italic text-slate-400 text-xs">
            No deliberations recorded in current session...
          </div>
        )}
      </div>
    </div>
  );
};
