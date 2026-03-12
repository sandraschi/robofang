import React from 'react';
import { 
    Bell, Shield, Info, AlertTriangle, AlertCircle, 
    CheckCircle2, Clock, Trash2, Settings,
    Cpu, Globe, Zap, Mail, MoreHorizontal
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';

const Notifications: React.FC = () => {
    const alerts = [
        { 
            id: '1', 
            type: 'critical', 
            title: 'Substrate Thermal Warning', 
            message: 'RTX 4090 junction temp exceeded 85C during high-quant inference.', 
            time: '2m ago',
            icon: AlertTriangle,
            color: 'text-rose-400',
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/20'
        },
        { 
            id: '2', 
            type: 'info', 
            title: 'MCP Fleet Discovery', 
            message: 'Detected 3 new nodes on local mesh. Ready for handshake.', 
            time: '15m ago',
            icon: Globe,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        { 
            id: '3', 
            type: 'success', 
            title: 'Backup Synchronized', 
            message: 'Daily system state successfully vaulted to CloudVault-Alpha.', 
            time: '1h ago',
            icon: CheckCircle2,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20'
        },
        { 
            id: '4', 
            type: 'warning', 
            title: 'Neural Sync Latency', 
            message: 'Bio-Digital bridge experiencing jitter (avg 42ms spike).', 
            time: '2h ago',
            icon: Zap,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20'
        },
    ];

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                            <Bell size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Command Feed</h1>
                    </div>
                    <p className="text-zinc-400 text-sm max-w-xl font-medium">
                        Central telemetry alerts and system event management.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all">
                        <Settings size={16} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all">
                        <Trash2 size={14} />
                        Dismiss All
                    </button>
                </div>
            </header>

            <div className="space-y-4">
                <AnimatePresence>
                    {alerts.map((alert, idx) => (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <GlassCard className={`p-5 flex items-start gap-6 group hover:bg-white/[0.03] transition-all cursor-pointer ${alert.border}`}>
                                <div className={`p-3 rounded-2xl ${alert.bg} ${alert.color} shrink-0`}>
                                    <alert.icon size={20} />
                                </div>
                                
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-white uppercase tracking-tight">{alert.title}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{alert.time}</span>
                                            <button className="opacity-0 group-hover:opacity-100 p-1 text-zinc-700 hover:text-white transition-all">
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">{alert.message}</p>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="pt-8 border-t border-white/5">
                <div className="flex items-center gap-3 px-2 mb-6">
                    <Clock size={14} className="text-zinc-700" />
                    <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Historical Archive</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <GlassCard className="p-4 flex items-center gap-4 bg-black/40 border-white/5 hover:border-white/10 transition-all">
                        <div className="p-2 rounded-xl bg-zinc-800 text-zinc-500"><Mail size={16} /></div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-zinc-300 truncate uppercase">Firmware Update Available</div>
                            <div className="text-[8px] font-mono text-zinc-700">VERSION: 2.5.4-STABLE</div>
                        </div>
                    </GlassCard>
                    <GlassCard className="p-4 flex items-center gap-4 bg-black/40 border-white/5 hover:border-white/10 transition-all">
                        <div className="p-2 rounded-xl bg-zinc-800 text-zinc-500"><Cpu size={16} /></div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-zinc-300 truncate uppercase">Substrate Calibration</div>
                            <div className="text-[8px] font-mono text-zinc-700">DRIFT_FIXED: 0.002ms</div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default Notifications;
