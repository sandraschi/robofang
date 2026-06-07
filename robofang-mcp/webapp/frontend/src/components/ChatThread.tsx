import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  pending?: boolean;
  error?: boolean;
}

interface ChatThreadProps {
  messages: ChatMessage[];
  className?: string;
}

export const ChatThread: React.FC<ChatThreadProps> = ({ messages, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={cn('glass-panel flex flex-col bg-black/30 h-full min-h-0', className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 shrink-0">
        <MessageSquare size={14} className="text-violet-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Chat</span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin min-h-0"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';

            if (isSystem) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-xs text-slate-500 max-w-md mx-auto leading-relaxed px-2"
                >
                  {msg.content}
                </motion.div>
              );
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-lg',
                    isUser
                      ? 'bg-violet-600/90 text-white rounded-br-md'
                      : 'bg-white/[0.06] border border-white/10 text-slate-200 rounded-bl-md',
                    msg.error && 'border-rose-500/40 bg-rose-950/30 text-rose-100'
                  )}
                >
                  {msg.pending ? (
                    <span className="inline-flex items-center gap-2 text-slate-400">
                      <Loader2 size={14} className="animate-spin" />
                      Thinking…
                    </span>
                  ) : (
                    <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                  )}
                  <div
                    className={cn(
                      'text-[10px] mt-1.5 opacity-50 font-mono',
                      isUser ? 'text-right' : 'text-left'
                    )}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
