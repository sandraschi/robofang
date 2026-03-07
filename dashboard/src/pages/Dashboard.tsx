import React, { useState, useEffect, useRef } from 'react';
import { Send, Zap, Brain, Sparkles, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { askQuestion } from '../api';

interface Message {
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
    model?: string;
}

const Dashboard: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await askQuestion(input);
            const agentMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                content: response.message,
                timestamp: new Date(),
                model: response.data?.model || 'Cortex-SOTA'
            };
            setMessages(prev => [...prev, agentMsg]);
        } catch (error) {
            console.error('Failed to ask:', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                content: "CRITICAL FAILURE: Neural bridge link severed. Check industrial backbone status.",
                timestamp: new Date(),
                model: 'SYSTEM'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] max-w-6xl mx-auto font-sans relative">
            {/* Header omitted for brevity in instruction but I'll keep it in the replacement */}
            <header className="flex flex-col gap-3 mb-8">
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        Neural Core
                    </div>
                </div>
                <h1 className="text-4xl font-heading font-bold tracking-tight text-white flex items-center gap-3">
                    <Brain className="text-indigo-400" size={32} />
                    Command <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Interface</span>
                </h1>
                <p className="text-slate-400 text-sm max-w-2xl font-medium">
                    Orchestrate the OpenFang grid with high-fidelity agents and autonomous mission control.
                </p>
            </header>

            {/* Chat Container */}
            <div className="flex-1 flex flex-col page-card p-0 overflow-hidden relative border-white/5 bg-white/[0.02]">
                {/* Status bar */}
                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Autonomous Sync</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 uppercase">
                        <span>PID: 10702</span>
                        <span>MEM: 2.4GB</span>
                    </div>
                </div>

                {/* Messages Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-8 py-10 space-y-8 relative z-10 custom-scrollbar"
                >
                    <AnimatePresence>
                        {messages.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center px-12"
                            >
                                <div className="w-24 h-24 rounded-3xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/15">
                                    <Sparkles className="text-indigo-400" size={40} />
                                </div>
                                <h2 className="text-2xl font-heading font-bold text-white mb-3 uppercase tracking-tight">Awaiting Command</h2>
                                <p className="text-slate-400 max-w-sm leading-relaxed text-sm font-medium">
                                    The Council is standing by for high-priority directives. Initialize the reasoning stream with your inquiry.
                                </p>
                            </motion.div>
                        )}

                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                            >
                                <div className={`p-4 rounded-2xl text-[14px] font-medium leading-relaxed shadow-lg ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-600/10'
                                    : 'bg-white/[0.04] text-slate-200 border border-white/5 rounded-tl-none shadow-black/20'
                                    }`}>
                                    {msg.content}
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 px-1">
                                    {msg.role === 'agent' ? (msg.model || 'OpenFang Core') : 'Sandra'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </motion.div>
                        ))}

                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-start gap-4"
                            >
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20 animate-pulse">
                                    <Sparkles size={20} className="text-white" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Processing...</span>
                                    </div>
                                    <div className="bg-white/[0.07] border border-white/[0.12] rounded-2xl rounded-tl-none px-6 py-4 flex gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Input Area */}
                <div className="px-8 py-6 border-t border-white/5 bg-white/[0.01] relative z-20">
                    <div className="relative group max-w-4xl mx-auto">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-all duration-700" />
                        <div className="relative flex items-center bg-[#0a0a16] border border-white/10 p-2 pl-4 rounded-2xl shadow-2xl focus-within:border-indigo-500/50 transition-all">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Issue an executive directive..."
                                className="flex-1 bg-transparent border-none outline-none py-2 text-sm text-white placeholder-slate-600 focus:ring-0 font-medium"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                title="Send Directive"
                                className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg ${isLoading || !input.trim()
                                    ? 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/25 active:scale-95'
                                    }`}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
