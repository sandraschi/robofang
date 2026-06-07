import React from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { cn } from '../utils/cn';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  useCouncil: boolean;
  onCouncilChange: (v: boolean) => void;
  useRag: boolean;
  onRagChange: (v: boolean) => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  value,
  onChange,
  onSend,
  isLoading,
  useCouncil,
  onCouncilChange,
  useRag,
  onRagChange,
}) => {
  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <div className="glass-panel p-3 flex flex-col gap-2 shrink-0">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="inline-flex items-center gap-2 cursor-pointer text-slate-400 select-none">
          <input
            type="checkbox"
            checked={useCouncil}
            onChange={(e) => onCouncilChange(e.target.checked)}
            className="rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-500/50"
          />
          Council
          <span className="text-slate-600 hidden sm:inline">(multi-model)</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer text-slate-400 select-none">
          <input
            type="checkbox"
            checked={useRag}
            onChange={(e) => onRagChange(e.target.checked)}
            className="rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-500/50"
          />
          RAG
        </label>
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          rows={1}
          placeholder="Message the bridge…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          className={cn(
            'flex-1 min-h-[44px] max-h-32 resize-y bg-transparent border border-white/10 rounded-xl',
            'outline-none text-sm px-4 py-2.5 placeholder:text-slate-600',
            'focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/30'
          )}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          title="Send message"
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl active:scale-95 transition-all shadow-lg shadow-violet-900/40 shrink-0"
        >
          {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
      <p className="text-[10px] text-slate-600">Enter to send · Shift+Enter for newline</p>
    </div>
  );
};
