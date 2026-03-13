import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  AlertTriangle, 
  Users,
  Bot,
  User
} from 'lucide-react';
import { chatApi } from '../api/chat';
import GlassCard from '../components/ui/GlassCard';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  error?: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [useCouncil, setUseCouncil] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    
    setInput('');
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const result = await chatApi.ask(text, 'sovereign', true, useCouncil);
      if (result.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: result.message, model: result.data?.model }
              : m,
          ),
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, error: result.error || 'Request failed' } : m,
          ),
        );
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, error: 'Bridge unreachable' } : m)),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-10rem)] flex flex-col gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold font-gradient flex items-center gap-3">
             <MessageSquare className="text-indigo-400" />
             Neural Interface
          </h2>
          <p className="text-text-secondary text-sm mt-1">Direct line to the RoboFang hub (MCP & robots).</p>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setUseCouncil(!useCouncil)}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${
               useCouncil 
                 ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' 
                 : 'bg-white/5 border-white/5 text-text-secondary hover:bg-white/10'
             }`}
           >
             <Users size={14} />
             {useCouncil ? 'Council Active' : 'Single Agent'}
           </button>
        </div>
      </header>

      <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden min-h-0 bg-black/10">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Bot size={48} className="text-indigo-500 mb-4" />
              <p className="text-sm font-mono uppercase tracking-[0.2em]">Awaiting Instruction...</p>
            </div>
          )}
          
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`p-2 rounded-full h-fit mt-1 shrink-0 ${
                  m.role === 'user' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-text-secondary'
                }`}>
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                
                <div className={`flex flex-col max-w-[80%] ${m.role === 'user' ? 'items-end' : ''}`}>
                  <div className={`p-4 rounded-2xl border text-sm leading-relaxed shadow-lg ${
                    m.role === 'user' 
                      ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-50' 
                      : 'bg-white/[0.03] border-white/5 text-text-primary'
                  }`}>
                    {m.content || (m.error ? null : <span className="flex gap-1"><span>.</span><span className="animate-pulse">.</span><span>.</span></span>)}
                    {m.error && (
                      <div className="flex items-center gap-2 mt-2 text-red-400 font-bold italic">
                        <AlertTriangle size={14} />
                        {m.error}
                      </div>
                    )}
                  </div>
                  {m.model && (
                    <span className="text-[9px] font-mono font-black uppercase text-indigo-400/50 mt-1 tracking-widest">{m.model}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        <div className="px-6 py-5 border-t border-white/5 bg-black/20">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-4"
          >
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query the MCP & robots hub..."
              disabled={sending}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm focus:border-indigo-500/50 outline-none transition-all placeholder:text-text-secondary/50 font-medium"
            />
            <button 
              type="submit"
              disabled={sending || !input.trim()}
              className="p-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-lg shadow-indigo-500/20"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      </GlassCard>
    </div>
  );
};

export default Chat;
