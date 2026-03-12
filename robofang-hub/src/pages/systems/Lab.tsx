import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Zap, Cpu, Activity, Shield, Layers, Database,
    Eye, Camera, FlaskConical, Trophy
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import LogicAnalyzer from '../../components/LogicAnalyzer';

const Lab: React.FC = () => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [stats] = useState({ fleet: 6, hands: 12 });

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    const nodes = [
        { id: 'bumi', title: 'ROBOTICS_BUMI', icon: Cpu, status: 'Connected', desc: 'Physical motor control and SLAM integration.', color: 'emerald' },
        { id: 'obs', title: 'STREAM_SUITE', icon: Camera, status: 'Passive', desc: 'Real-time video capture and automation.', color: 'blue' },
        { id: 'ocr', title: 'EYE_INTELLIGENCE', icon: Eye, status: 'Active', desc: 'Advanced OCR and visual reasoning agent.', color: 'purple' },
        { id: 'plex', title: 'MEDIA_VAULT', icon: Database, status: 'Connected', desc: 'Distributed library and metadata orchestration.', color: 'indigo' },
        { id: 'calibre', title: 'KNOWLEDGE_CORE', icon: Layers, status: 'Active', desc: 'E-book library indexing and synthesis.', color: 'cyan' },
        { id: 'ollama', title: 'NEURAL_FABRIC', icon: Zap, status: 'Syncing', desc: 'Local LLM inference cluster (RTX 4090).', color: 'orange' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            <FlaskConical size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight italic">System Showroom</h1>
                    </div>
                    <p className="text-zinc-400 text-sm max-w-xl font-medium">
                        Autonomous OS architectural showcase and node matrix.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black border border-emerald-500/20 rounded-full uppercase tracking-widest">BUILD_CORE_2026</span>
                    <span className="text-zinc-600 text-[9px] font-mono tracking-widest uppercase">Zero-Trust Verified</span>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8">
                {/* Left Column */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 ml-1">
                            <Activity className="text-emerald-400" size={16} />
                            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Logic Stream</h2>
                        </div>
                        <LogicAnalyzer />
                    </div>

                    <GlassCard className="p-6">
                        <h3 className="text-[10px] font-black text-zinc-500 mb-6 font-mono tracking-widest uppercase border-b border-white/5 pb-3">Autonomous Status</h3>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">Active Hands</span>
                                <div className="text-4xl font-black text-white">{stats.hands}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">Fleet Nodes</span>
                                <div className="text-4xl font-black text-white">{stats.fleet}</div>
                            </div>
                        </div>
                        <div className="mt-8 flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <Shield className="text-emerald-400 animate-pulse" size={16} />
                                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest">AES_256 SECURED</span>
                            </div>
                            <Zap className="text-amber-400" size={16} />
                        </div>
                    </GlassCard>
                </div>

                {/* Main Grid */}
                <div className="col-span-12 lg:col-span-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {nodes.map((node, idx) => (
                            <motion.div
                                key={node.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <GlassCard className="p-5 group hover:bg-white/[0.04] transition-all cursor-crosshair">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-xl bg-white/5 group-hover:scale-110 transition-transform border border-white/10 group-hover:bg-white/10">
                                            <node.icon className="text-white" size={24} />
                                        </div>
                                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{node.status}</span>
                                    </div>
                                    <h3 className="text-sm font-black text-white mb-2 tracking-tight group-hover:text-amber-400 transition-colors uppercase">{node.title}</h3>
                                    <p className="text-[10px] text-zinc-500 font-medium leading-relaxed mb-6">{node.desc}</p>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: isLoaded ? '100%' : '0%' }}
                                            transition={{ duration: 1.5, delay: 0.5 + idx * 0.1 }}
                                            className="h-full bg-emerald-500/50"
                                        />
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>

                    <GlassCard className="mt-8 p-8">
                        <div className="flex flex-col md:flex-row items-center gap-6 mb-8 border-b border-white/5 pb-8">
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <Trophy size={32} />
                            </div>
                            <div className="text-center md:text-left">
                                <h3 className="text-xl font-black text-white tracking-widest uppercase">Benchmark Matrix</h3>
                                <p className="text-xs text-zinc-500 font-medium italic">RoboFang Core Analysis 2026</p>
                            </div>
                            <div className="md:ml-auto">
                                <span className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.1)]">GAP: 3.4x</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left font-mono">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Metric</th>
                                        <th className="py-4 px-4 text-[10px] font-black text-emerald-400 border-x border-white/5 bg-white/[0.02] text-center uppercase tracking-widest">RoboFang</th>
                                        <th className="py-4 px-4 text-[10px] font-black text-zinc-600 text-center uppercase tracking-widest">Legacy/Other</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { m: 'Substrate', rf: 'Universal', ot: 'Specialized' },
                                        { m: 'Latency', rf: '< 1ms', ot: '> 250ms' },
                                        { m: 'Cohesion', rf: '99.9%', ot: '64.2%' },
                                        { m: 'Security', rf: 'Zero-Trust', ot: 'Perimeter' },
                                    ].map((row, idx) => (
                                        <tr key={idx} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                                            <td className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-tight">{row.m}</td>
                                            <td className="py-4 px-4 text-[11px] font-black text-white border-x border-white/5 bg-white/[0.01] text-center">{row.rf}</td>
                                            <td className="py-4 px-4 text-[11px] font-bold text-zinc-600 text-center">{row.ot}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default Lab;
