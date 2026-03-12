import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, 
    Terminal, 
    MessageSquare, 
    Loader2 
} from 'lucide-react';
import { deliberationsApi } from '../api/deliberations';
import type { DeliberationStep } from '../api/deliberations';
import GlassCard from '../components/ui/GlassCard';

const Deliberations: React.FC = () => {
    const [deliberations, setDeliberations] = useState<DeliberationStep[]>([]);
    const [loading, setLoading] = useState(false);
    const [latestId, setLatestId] = useState<number | null>(null);

    const loadDeliberations = useCallback(async () => {
        try {
            const data = await deliberationsApi.get(latestId || undefined);
            if (data.deliberations && data.deliberations.length > 0) {
                setDeliberations(prev => {
                    const newEntries = data.deliberations.filter(
                        (d: DeliberationStep) => !prev.some(p => p.id === d.id)
                    );
                    return [...newEntries, ...prev].slice(0, 50);
                });
                setLatestId(data.latest_id);
            }
        } catch (err) {
            console.error('Failed to fetch deliberations:', err);
        }
    }, [latestId]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                await loadDeliberations();
            } finally {
                setLoading(false);
            }
        };
        load();
        const interval = setInterval(loadDeliberations, 5000);
        return () => clearInterval(interval);
    }, [loadDeliberations]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            <header className="flex flex-col gap-2">
                <h2 className="text-4xl font-bold font-gradient">Analysis History</h2>
                <p className="text-text-secondary text-sm">Real-time telemetry from the multi-agent reasoning processes.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    {loading && deliberations.length === 0 ? (
                        <GlassCard className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
                            <Loader2 size={32} className="animate-spin text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Fetching logs...</span>
                        </GlassCard>
                    ) : deliberations.length === 0 ? (
                        <GlassCard className="flex flex-col items-center justify-center p-20 gap-4 opacity-30">
                            <Terminal size={32} />
                            <span className="text-sm font-medium">No active reasoning logs found.</span>
                        </GlassCard>
                    ) : (
                        <AnimatePresence initial={false}>
                            {deliberations.map((step) => (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -20, scale: 0.98 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    className="p-1 rounded-3xl glass-panel relative group"
                                >
                                    <div className="flex items-center justify-between px-6 py-4 bg-white/5 rounded-t-2xl border-b border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-xl ${
                                                step.type === 'thought' ? 'bg-indigo-500/10 text-indigo-400' :
                                                step.type === 'adjudication' ? 'bg-emerald-500/10 text-emerald-400' :
                                                'bg-amber-500/10 text-amber-400'
                                            }`}>
                                                {step.type === 'thought' ? <Terminal size={14} /> :
                                                 step.type === 'adjudication' ? <Activity size={14} /> :
                                                 <MessageSquare size={14} />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">Persona</span>
                                                <span className="text-sm font-bold">{step.agent}</span>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-mono text-text-secondary font-bold">
                                            {step.timestamp}
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="p-5 bg-black/40 rounded-2xl border border-white/5 font-mono text-xs leading-relaxed text-indigo-100/80">
                                            <span className="text-indigo-500 mr-2">❯</span>
                                            {step.content}
                                        </div>
                                    </div>
                                    <div className="absolute left-0 top-4 bottom-4 w-1 bg-indigo-500/0 group-hover:bg-indigo-500/40 transition-all rounded-r-full" />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>

                <div className="space-y-6">
                    <GlassCard title="Telemetry Metrics">
                        <div className="space-y-4">
                           {[
                              { label: 'Latency', val: '142ms', color: 'text-indigo-400' },
                              { label: 'Consensus', val: '98.4%', color: 'text-emerald-400' },
                              { label: 'Depth', val: 'Level 3', color: 'text-amber-400' },
                           ].map((m, i) => (
                              <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                 <span className="text-[9px] font-black uppercase text-text-secondary tracking-widest">{m.label}</span>
                                 <span className={`text-xs font-mono font-bold ${m.color}`}>{m.val}</span>
                              </div>
                           ))}
                        </div>
                    </GlassCard>

                    <GlassCard title="Neural Activity">
                         <div className="h-32 flex items-end gap-1.5 px-2">
                             {[40, 70, 45, 90, 65, 30, 80, 55, 95, 75, 40, 60, 85].map((h, i) => (
                                 <motion.div
                                     key={i}
                                     initial={{ height: 0 }}
                                     animate={{ height: `${h}%` }}
                                     className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-sm opacity-60"
                                     transition={{
                                         delay: i * 0.05,
                                         repeat: Infinity,
                                         repeatType: 'reverse',
                                         duration: 1.5 + (i % 2)
                                     }}
                                 />
                             ))}
                         </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default Deliberations;
