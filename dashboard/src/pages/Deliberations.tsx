import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, Terminal, Activity, MessageSquare, Loader2 } from 'lucide-react';

const BRIDGE = 'http://localhost:10865';

interface DeliberationStep {
    id: number;
    timestamp: string;
    agent: string;
    type: string;
    content: string;
}

const Deliberations: React.FC = () => {
    const [deliberations, setDeliberations] = useState<DeliberationStep[]>([]);
    const [loading, setLoading] = useState(false);
    const [latestId, setLatestId] = useState<number | null>(null);

    const loadDeliberations = useCallback(async () => {
        try {
            const url = latestId
                ? `${BRIDGE}/deliberations?since_id=${latestId}`
                : `${BRIDGE}/deliberations`;

            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();

            if (data.deliberations && data.deliberations.length > 0) {
                setDeliberations(prev => {
                    const newEntries = data.deliberations.filter(
                        (d: DeliberationStep) => !prev.some(p => p.id === d.id)
                    );
                    return [...newEntries, ...prev].slice(0, 50); // Keep latest 50
                });
                setLatestId(data.latest_id);
            }
        } catch (err) {
            console.error('Failed to fetch deliberations:', err);
        }
    }, [latestId]);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        loadDeliberations().finally(() => {
            if (isMounted) setLoading(false);
        });
        const id = setInterval(loadDeliberations, 5000);
        return () => {
            isMounted = false;
            clearInterval(id);
        };
    }, [loadDeliberations]);

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col gap-2 p-1">
                <h1 className="text-4xl font-black text-white font-heading tracking-tight">Sovereign Deliberations</h1>
                <p className="text-slate-400 text-sm leading-relaxed">Live reasoning stream from the OpenFang orchestration layer. High-fidelity log of inter-agent cognitive cycles.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    {loading && deliberations.length === 0 ? (
                        <div className="page-card p-12 flex items-center justify-center text-slate-500 gap-3">
                            <Loader2 className="animate-spin" size={20} />
                            Scanning neural pathways...
                        </div>
                    ) : deliberations.length === 0 ? (
                        <div className="page-card p-12 flex items-center justify-center text-slate-500">
                            No recent deliberations recorded. Initiating mission will trigger stream.
                        </div>
                    ) : (
                        deliberations.map((step, idx) => (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -20, scale: 0.98 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                className="page-card p-0 overflow-hidden bg-white/[0.02] border-white/[0.04] group hover:border-indigo-500/30 transition-all duration-500"
                            >
                                <div className="px-6 py-4 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-xl border ${step.type === 'thought' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                            step.type === 'system' || step.type === 'adjudication' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                            {step.type === 'thought' ? <Terminal size={16} /> :
                                                step.type === 'system' || step.type === 'adjudication' ? <Activity size={16} /> :
                                                    <MessageSquare size={16} />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Agent Persona</span>
                                            <span className="text-sm font-bold text-white tracking-tight">{step.agent}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.05] text-[9px] font-mono text-slate-500">
                                            {step.timestamp}
                                        </div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40" />
                                    </div>
                                </div>

                                <div className="p-6 relative">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/10 group-hover:bg-indigo-500/40 transition-colors duration-500" />
                                    <div className="p-5 bg-[#050507]/60 rounded-2xl border border-white/[0.03] shadow-inner relative overflow-hidden">
                                        <div className="absolute inset-0 noise-bg opacity-[0.03] pointer-events-none" />
                                        <p className="text-xs font-mono text-indigo-100/80 leading-relaxed relative z-10 selection:bg-indigo-500/30">
                                            <span className="text-indigo-500 mr-2">❯</span>
                                            {step.content}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )))}
                </div>

                <div className="space-y-6">
                    <div className="page-card p-8 border-white/[0.04] bg-white/[0.01] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.02] to-transparent pointer-events-none" />
                        <div className="relative z-10 text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-2 shadow-2xl shadow-indigo-500/5 group-hover:scale-110 transition-transform duration-500">
                                <ScrollText size={32} className="text-indigo-400" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Stream Metrics</h3>
                            <div className="space-y-4 pt-4">
                                {[
                                    { label: 'Avg latency', val: '142ms', color: 'text-indigo-400' },
                                    { label: 'Agent consensus', val: '98.4%', color: 'text-emerald-400' },
                                    { label: 'Context depth', val: 'Level 3', color: 'text-amber-400' },
                                ].map((m, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl border border-white/[0.03]">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{m.label}</span>
                                        <span className={`text-xs font-mono font-bold ${m.color}`}>{m.val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="page-card p-8 border-white/[0.04] bg-white/[0.01] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/[0.03] to-transparent pointer-events-none" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-6 text-center">Neural Activity</h3>
                        <div className="h-32 flex items-end gap-1.5 px-2 relative z-10">
                            {[40, 70, 45, 90, 65, 30, 80, 55, 95, 75, 40, 60, 85].map((h, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-sm opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                                    transition={{
                                        delay: i * 0.05,
                                        repeat: Infinity,
                                        repeatType: 'reverse',
                                        duration: 1.5 + (i % 2)
                                    }}
                                />
                            ))}
                        </div>
                        <div className="mt-4 flex justify-between px-2 text-[8px] font-mono text-slate-600 font-bold uppercase tracking-widest">
                            <span>0ms</span>
                            <span>Reasoning Cycle</span>
                            <span>250ms</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Deliberations;
