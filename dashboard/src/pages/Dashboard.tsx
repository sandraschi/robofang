import React, { useState, useEffect, useRef } from 'react';
import { Send, Brain, Sparkles, Star, History, Wand2, ChevronDown, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { askQuestion, getLlmModels, llmGenerate, getSupervisorPulse, getFleetHealth } from '../api';

interface Message {
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
    model?: string;
}

const SUGGESTIONS = [
    "Analyze fleet status and suggest security optimizations.",
    "Initialize graffiti overspray: Restore concrete facade with matching palette.",
    "Process analog darkroom mission: Develop and dry 35mm film substrates.",
    "Execute DIY construction sequence: Magnetic axial nail grip and hammer.",
    "Stiffen silk substrate: Apply 7.50% gelatin concentration for handling.",
    "Activate Hedgehog Vanguard: Autonomous safety escort for mowerbot.",
    "Wildlife Rescue: Deploy thermal search for injured nestlings.",
    "Security Audit: Verify perimeter fence integrity and GPS-tag breaches.",
    "Pet Play: Launch tennis ball and dispense rewards.",
    "Puppy Supervision: Monitor for behavioral 'pfui' events with acoustic correction.",
    "Laser Play: Engage low-energy eye-safe laser pointer for pet agility.",
    "Pool Supervision: Active perimeter safety monitoring for the pool deck.",
    "Toddler Safety: Scan for choke hazards and monitor boundary breaches.",
    "Companion Logistics: Deploy 'Huggie-Suit' and initiate emotional state auditing.",
    "Mural Painting: Deploy nursery animal scenes and precision transfers.",
    "Emergency Dispatch: Call Brother Steve regarding a health crisis at Alsergrund.",
    "Simulate a Council of Dozens deliberation on energy efficiency.",
    "Summarize the collective intelligence of all online connectors.",
    "Design a high-fidelity dashboard layout for creative hubs.",
    "Perform a forensic audit of the neural bridge logs.",
    "Evaluate the performance impact of redundant RAG pipelines.",
    "Generate a SOTA-inspired UI theme for the Sovereign Hub.",
    "Identify technical debt in the core supervisor logic.",
];

interface OllamaModel {
    name: string;
    size: number;
    modified_at: string;
    details?: { parameter_size?: string; quantization_level?: string; family?: string };
}

const Dashboard: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showRecents, setShowRecents] = useState(false);
    const [recents, setRecents] = useState<string[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [llmModels, setLlmModels] = useState<OllamaModel[]>([]);
    const [pulse, setPulse] = useState<{ timestamp: number, count: number, uptime: number, integrity: string } | null>(null);
    const [isHealthy, setIsHealthy] = useState(true);
    const [cohesion, setCohesion] = useState(100);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Persistence
    useEffect(() => {
        const savedRecents = localStorage.getItem('RoboFang_recents');
        const savedFavorites = localStorage.getItem('RoboFang_favorites');
        if (savedRecents) setRecents(JSON.parse(savedRecents));
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

        // Fetch models for refiner
        getLlmModels().then(data => setLlmModels(data.models || [])).catch(console.error);

        // Heartbeat polling
        const pollPulse = async () => {
            try {
                const data = await getSupervisorPulse();
                if (data.success) {
                    setPulse(data.pulse);
                    setIsHealthy(true);
                }
            } catch (err) {
                console.error("Pulse failure:", err);
                setIsHealthy(false);
            }
        };

        const interval = setInterval(async () => {
            await pollPulse();
            try {
                const healthData = await getFleetHealth();
                if (healthData.success) {
                    setCohesion(healthData.report.cohesion_score);
                }
            } catch (err) {
                console.error("Health poll failure:", err);
            }
        }, 5000);
        pollPulse();
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        localStorage.setItem('RoboFang_recents', JSON.stringify(recents));
    }, [recents]);

    useEffect(() => {
        localStorage.setItem('RoboFang_favorites', JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const addToRecents = (cmd: string) => {
        setRecents(prev => {
            const filtered = prev.filter(r => r !== cmd);
            return [cmd, ...filtered].slice(0, 20);
        });
    };

    const toggleFavorite = (cmd: string) => {
        setFavorites(prev => {
            if (prev.includes(cmd)) return prev.filter(f => f !== cmd);
            return [cmd, ...prev];
        });
    };

    const handleSend = async (text: string = input) => {
        const targetText = text.trim();
        if (!targetText || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: targetText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        addToRecents(targetText);

        try {
            const response = await askQuestion(targetText);
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

    const refinePrompt = async () => {
        if (!input.trim() || isRefining || llmModels.length === 0) return;
        setIsRefining(true);
        try {
            const model = llmModels[0].name;
            const systemPrompt = "You are a prompt engineering expert for RoboFang, a sovereign agent OS. Refine and extend the following command to be more technical, precise, and effective for autonomous agents. Use professional SOTA terminology. Output ONLY the refined prompt text without any preamble or quotes.";
            const res = await llmGenerate(model, `${systemPrompt}\n\nUser Command: ${input}`);
            if (res?.response) {
                setInput(res.response.trim());
            }
        } catch (error) {
            console.error('Refinement failed:', error);
        } finally {
            setIsRefining(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] max-w-6xl mx-auto font-sans relative">
            <header className="flex flex-col gap-3 mb-8">
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        Neural Core
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-heading font-bold tracking-tight text-white flex items-center gap-3">
                            <Brain className="text-indigo-400" size={32} />
                            Command <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Interface</span>
                        </h1>
                        <p className="text-slate-400 text-sm max-w-2xl font-medium mt-1">
                            Orchestrate the RoboFang grid with high-fidelity agents and autonomous mission control.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowRecents(!showRecents)}
                            className={`p-2.5 rounded-xl border transition-all ${showRecents ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10'}`}
                            title="Recents & Favorites"
                        >
                            <History size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Chat Container */}
            <div className="flex-1 flex flex-col page-card p-0 overflow-hidden relative border-white/5 bg-white/[0.02]">
                {/* Status bar */}
                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${isHealthy && pulse?.integrity === 'nominal' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : pulse?.integrity?.includes('degraded') ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">
                                {isHealthy ? (pulse?.integrity === 'nominal' ? 'Autonomous Sync' : pulse?.integrity) : 'Link Severed'}
                            </span>
                        </div>

                        {isHealthy && (
                            <div className="flex items-center gap-4 animate-pulse-subtle">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between min-w-[120px]">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Fleet Cohesion</span>
                                        <span className="text-[8px] font-mono text-indigo-400">{cohesion}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${cohesion}%` }}
                                            className={`h-full ${cohesion > 80 ? 'bg-emerald-500' : cohesion > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 overflow-hidden w-24 h-4 bg-indigo-500/5 rounded-full border border-indigo-500/10 px-1">
                                    {[...Array(12)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ height: 2 }}
                                            animate={{ height: [2, Math.random() * 10 + 2, 2] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                                            className="w-1 bg-indigo-400/40 rounded-full"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 uppercase">
                        <span>Pulse: {pulse?.count || 0}</span>
                        <span>Uptime: {pulse ? Math.floor(pulse.uptime / 60) : 0}m</span>
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
                                <div className="relative mb-8 group">
                                    <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                                    <motion.img
                                        src="/assets/hero.png"
                                        alt="RoboFang Neural Core"
                                        className="w-48 h-48 relative z-10 drop-shadow-[0_0_30px_rgba(99,102,241,0.3)] object-contain"
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    />
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
                                <div className={`p-4 rounded-2xl text-[14px] font-medium leading-relaxed shadow-lg relative group ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-600/10'
                                    : 'bg-white/[0.04] text-slate-200 border border-white/5 rounded-tl-none shadow-black/20'
                                    }`}>
                                    {msg.content}
                                    {msg.role === 'user' && (
                                        <button
                                            onClick={() => toggleFavorite(msg.content)}
                                            title={favorites.includes(msg.content) ? "Remove from Favorites" : "Add to Favorites"}
                                            className={`absolute -left-10 top-1 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${favorites.includes(msg.content) ? 'text-yellow-400' : 'text-slate-500 hover:text-white'}`}
                                        >
                                            <Star size={14} fill={favorites.includes(msg.content) ? "currentColor" : "none"} />
                                        </button>
                                    )}
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 px-1">
                                    {msg.role === 'agent' ? (msg.model || 'RoboFang Core') : 'Sandra'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

                {/* Recents/Favorites Overlay */}
                <AnimatePresence>
                    {showRecents && (
                        <motion.div
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 300 }}
                            className="absolute right-0 top-[60px] bottom-0 w-[400px] bg-[#0a0a16]/95 backdrop-blur-3xl border-l border-white/5 z-40 p-6 flex flex-col shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-heading font-bold text-white uppercase tracking-tight flex items-center gap-2">
                                    <History className="text-indigo-400" size={18} />
                                    Substrate History
                                </h3>
                                <button
                                    onClick={() => setShowRecents(false)}
                                    title="Close History"
                                    className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pr-2">
                                {favorites.length > 0 && (
                                    <section>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <Star size={10} className="text-yellow-400" fill="currentColor" />
                                            Favorites
                                        </div>
                                        <div className="space-y-2">
                                            {favorites.map((fav, i) => (
                                                <div key={i} className="group relative">
                                                    <button
                                                        onClick={() => { setInput(fav); setShowRecents(false); }}
                                                        className="w-full text-left p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all text-sm text-slate-300 font-medium line-clamp-2"
                                                    >
                                                        {fav}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(fav); }}
                                                        title="Remove from Favorites"
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Star size={14} fill="currentColor" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <section>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Recent Directives</div>
                                    {recents.length === 0 ? (
                                        <div className="text-center py-12 bg-white/[0.02] border border-dashed border-white/5 rounded-2xl">
                                            <p className="text-xs text-slate-500 font-medium">No recent commands archived.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {recents.map((rec, i) => (
                                                <div key={i} className="group relative">
                                                    <button
                                                        onClick={() => { setInput(rec); setShowRecents(false); }}
                                                        className="w-full text-left p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all text-sm text-slate-300 font-medium line-clamp-2 pr-10"
                                                    >
                                                        {rec}
                                                    </button>
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleFavorite(rec); }}
                                                            title={favorites.includes(rec) ? "Remove from Favorites" : "Add to Favorites"}
                                                            className={`p-2 transition-colors ${favorites.includes(rec) ? 'text-yellow-500' : 'text-slate-500 hover:text-white'}`}
                                                        >
                                                            <Star size={14} fill={favorites.includes(rec) ? "currentColor" : "none"} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setRecents(prev => prev.filter(r => r !== rec)); }}
                                                            title="Delete from Recents"
                                                            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Input Area */}
                <div className="px-8 py-6 border-t border-white/5 bg-white/[0.01] relative z-20">
                    <div className="relative group max-w-4xl mx-auto flex flex-col gap-4">
                        {/* Prompt Enhancements row */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button
                                    onClick={() => setShowSuggestions(!showSuggestions)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-widest transition-all ${showSuggestions ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10'}`}
                                >
                                    <Sparkles size={13} />
                                    Quick Suggestions
                                    <ChevronDown size={13} className={`transition-transform duration-300 ${showSuggestions ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showSuggestions && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute bottom-full mb-3 left-0 w-[420px] bg-[#0a0a16] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-3xl"
                                        >
                                            <div className="grid grid-cols-1 gap-1">
                                                {SUGGESTIONS.map((s, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => { setInput(s); setShowSuggestions(false); }}
                                                        className="text-left w-full p-2.5 rounded-xl hover:bg-indigo-600/10 text-[13px] text-slate-300 font-medium transition-colors line-clamp-1 border border-transparent hover:border-indigo-500/20"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button
                                onClick={refinePrompt}
                                disabled={!input.trim() || isRefining || llmModels.length === 0}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:bg-white/5 hover:border-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                            >
                                <Wand2 size={13} className={isRefining ? "animate-spin" : "group-hover:rotate-12 transition-transform"} />
                                {isRefining ? "Refining..." : "Refine Directive"}
                            </button>

                            {llmModels.length > 0 && (
                                <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-slate-500 bg-white/[0.02] px-2 py-1 rounded-md border border-white/5 tracking-tighter">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    Refiner: {llmModels[0].name}
                                </div>
                            )}
                        </div>

                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-all duration-700" />
                            <div className="relative flex items-center bg-[#0a0a16] border border-white/10 p-2 pl-4 rounded-2xl shadow-2xl focus-within:border-indigo-500/50 transition-all">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Issue an executive directive..."
                                    className="flex-1 bg-transparent border-none outline-none py-2 text-base text-white placeholder-slate-600 focus:ring-0 font-medium"
                                />
                                <button
                                    onClick={() => handleSend()}
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
        </div>
    );
};

export default Dashboard;
