import React from 'react';
import {
  Activity, User, Shield,
  Zap,
  Fingerprint, Hexagon, Target,
  Settings, LogOut, Dna, Award
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { motion } from 'framer-motion';

const Profile: React.FC = () => {
    const stats = [
        { label: 'Neural Sync', value: '98.4%', icon: Zap, color: 'text-yellow-400' },
        { label: 'Substrate XP', value: 'Level 42', icon: Target, color: 'text-emerald-400' },
        { label: 'Bio-Latency', value: '12ms', icon: Activity, color: 'text-blue-400' },
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
            {/* Profile Header */}
            <header className="flex flex-col md:flex-row items-center gap-12 text-center md:text-left">
                <div className="relative">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-cyan-500/30 p-1 bg-black/40">
                        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <User size={64} className="text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-black border border-white/10 text-cyan-400 shadow-xl">
                        <Fingerprint size={20} />
                    </div>
                </div>

                <div className="space-y-4 flex-1">
                    <div className="space-y-1">
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Sandra Schipal</h1>
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black text-cyan-400 tracking-widest">OWNER</span>
                        </div>
                        <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">ID: BRAIN-SECURE-ALPHA-2026</p>
                    </div>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        {stats.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/5">
                                <s.icon size={14} className={s.color} />
                                <span className="text-[10px] font-black text-white tracking-widest uppercase">{s.label}: </span>
                                <span className={`text-[10px] font-mono font-bold ${s.color}`}>{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3 shrink-0">
                    <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all">
                        <Settings size={14} />
                        Identity Config
                    </button>
                    <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all">
                        <LogOut size={14} />
                        Sever Link
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Identity DNA */}
                <div className="md:col-span-2 space-y-6">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                        <Dna size={14} />
                        Biometric Substrate Hash
                    </h3>
                    <GlassCard className="p-8 space-y-8 overflow-hidden relative">
                        <div className="absolute -top-24 -right-24 opacity-5 pointer-events-none">
                            <Hexagon size={400} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="space-y-4">
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                                        {Array.from({ length: 5 }).map((_, barIdx) => (
                                            <motion.div
                                                key={barIdx}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.random() * 80 + 20}%` }}
                                                transition={{ duration: 1.5, delay: i * 0.1 + barIdx * 0.05 }}
                                                className="h-full bg-cyan-500/20 rounded-sm shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                            />
                                        ))}
                                    </div>
                                    <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">GEN-SEQ-{i.toString().padStart(2, '0')}</div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-8 border-t border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Permissions</span>
                                <span className="text-[9px] font-mono text-emerald-400 uppercase">12 NODES AUTHORIZED</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {['SYSTEM_ADMIN', 'MCP_ROOT', 'OLLAMA_USER', 'PLEX_OWNER', 'DOCKER_MGR'].map(p => (
                                    <span key={p} className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-[9px] font-black text-zinc-300 tracking-wider">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Achievements / Security */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                        <Shield size={14} />
                        Security Posture
                    </h3>
                    <GlassCard className="p-6 space-y-4">
                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-black text-emerald-400 uppercase">
                                <span>Multi-Factor</span>
                                <CheckCircle />
                            </div>
                            <p className="text-[9px] text-zinc-500 font-medium">Orbital bio-sync active via secondary tapo-eye.</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-black text-blue-400 uppercase">
                                <span>Session Key</span>
                                <span className="font-mono text-[9px]">4096-RSA</span>
                            </div>
                            <p className="text-[9px] text-zinc-500 font-medium">Rotation every 24h. Next refresh in 4.2h.</p>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Award size={14} className="text-amber-500" />
                            Substrate Badges
                        </h3>
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-700 hover:text-amber-400 cursor-help transition-all">
                                    <Hexagon size={18} />
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

const CheckCircle = () => (
    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
);

export default Profile;
