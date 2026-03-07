import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Loader2, AlertTriangle, Users } from 'lucide-react';
import { askQuestion } from '../api';

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
    const [persona] = useState('sovereign');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async () => {
        const text = input.trim();
        if (!text || sending) return;
        setInput('');
        const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
        setMessages((prev) => [...prev, userMsg]);
        setSending(true);
        const assistantId = `a-${Date.now()}`;
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        try {
            const result = await askQuestion(text, persona, true, useCouncil);
            if (result?.success && result?.message !== undefined) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? { ...m, content: result.message, model: result?.data?.model }
                            : m,
                    ),
                );
            } else {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId ? { ...m, content: '', error: result?.error ?? 'Request failed' } : m,
                    ),
                );
            }
        } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: '', error: err } : m)),
            );
        }
        setSending(false);
    };

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
            <header className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-white font-heading flex items-center gap-3">
                        <MessageSquare className="text-indigo-400" />
                        Chat
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Talk to the Sovereign Hub via Bridge. Toggle Council for multi-agent synthesis.
                    </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={useCouncil}
                        onChange={(e) => setUseCouncil(e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                    />
                    <Users size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-300">Council of Dozens</span>
                </label>
            </header>

            <div className="flex-1 bg-[#16162a] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-slate-500 py-12 text-sm">
                            Send a message to start. Use Council for complex synthesis.
                        </div>
                    )}
                    {messages.map((m) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                    m.role === 'user'
                                        ? 'bg-indigo-600/20 border border-indigo-500/30 text-slate-100'
                                        : 'bg-white/[0.06] border border-white/10 text-slate-200'
                                }`}
                            >
                                <div className="text-sm whitespace-pre-wrap">{m.content || (m.error ? null : '…')}</div>
                                {m.error && (
                                    <div className="flex items-center gap-2 mt-2 text-red-400 text-xs">
                                        <AlertTriangle size={12} />
                                        {m.error}
                                    </div>
                                )}
                                {m.model && (
                                    <div className="text-[10px] text-slate-500 mt-1 font-mono">{m.model}</div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                    {sending && (
                        <div className="flex justify-start">
                            <div className="bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3">
                                <Loader2 size={16} className="animate-spin text-indigo-400" />
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                <div className="p-4 border-t border-white/10">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            send();
                        }}
                        className="flex gap-3"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Message the hub..."
                            className="flex-1 bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            disabled={sending || !input.trim()}
                            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-40"
                        >
                            <Send size={14} />
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chat;
