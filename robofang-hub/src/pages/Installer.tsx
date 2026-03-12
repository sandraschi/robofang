import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Download, CheckCircle2, XCircle, Loader2,
    ChevronRight, ShieldCheck, Box
} from 'lucide-react';
import { getFleetMarket, installFleetNode, getFleetInstallerStatus } from '../api/fleet';

interface MarketNode {
    id: string;
    name: string;
    description: string;
    port: number;
    repo_path: string;
    icon: string;
    category: string;
}

interface InstallStatus {
    status: 'installing' | 'completed' | 'failed';
    logs: string[];
}

const Installer: React.FC = () => {
    const [market, setMarket] = useState<MarketNode[]>([]);
    const [statuses, setStatuses] = useState<Record<string, InstallStatus>>({});
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const fetchMarket = async () => {
        try {
            const res = await getFleetMarket();
            if (res.success) setMarket(res.market);
        } catch (e) {
            console.error('Failed to fetch market', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStatus = async () => {
        try {
            const res = await getFleetInstallerStatus();
            if (res.success) setStatuses(res.status);
        } catch (e) {
            console.error('Failed to fetch install status', e);
        }
    };

    useEffect(() => {
        fetchMarket();
        const timer = setInterval(fetchStatus, 2000);
        return () => clearInterval(timer);
    }, []);

    const toggleSelect = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    const handleInstall = async () => {
        for (const id of selected) {
            await installFleetNode(id);
        }
        setSelected(new Set());
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        System Provisioning
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-5xl font-heading font-bold tracking-tight text-white mb-2">
                            Fleet <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">Installer</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl font-medium">
                            Orchestrate the deployment of associated MCP servers and webapps across your local substrate.
                        </p>
                    </div>
                    {selected.size > 0 && (
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={handleInstall}
                            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20"
                        >
                            <Download size={20} />
                            Install {selected.size} Node{selected.size > 1 ? 's' : ''}
                        </motion.button>
                    )}
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="text-indigo-500 animate-spin" size={40} />
                    <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.3em]">Querying Registry...</p>
                </div>
            ) : (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {market.map(node => {
                        const status = statuses[node.id];
                        const isInstalling = status?.status === 'installing';
                        const isCompleted = status?.status === 'completed';
                        const isFailed = status?.status === 'failed';
                        const isSelected = selected.has(node.id);

                        return (
                            <motion.div
                                key={node.id}
                                variants={item}
                                onClick={() => !isInstalling && !isCompleted && toggleSelect(node.id)}
                                className={`group relative p-6 rounded-3xl border transition-all cursor-pointer overflow-hidden ${isSelected
                                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                    : 'bg-[#16162a] border-white/5 hover:border-white/10'
                                    } ${isCompleted ? 'opacity-60 cursor-default' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-3 rounded-2xl border ${isSelected ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-white/5 border-white/10 text-slate-400 group-hover:text-white'
                                        }`}>
                                        <Box size={24} />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {isInstalling && <Loader2 size={16} className="text-indigo-400 animate-spin" />}
                                        {isCompleted && <CheckCircle2 size={16} className="text-emerald-400" />}
                                        {isFailed && <XCircle size={16} className="text-red-400" />}
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{node.category}</span>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-2">{node.name}</h3>
                                <p className="text-xs text-slate-400 leading-relaxed mb-6 line-clamp-2">{node.description}</p>

                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest mt-auto">
                                    <span className="text-slate-600 font-mono">Port {node.port}</span>
                                    <div className="flex items-center gap-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span>Select for Install</span>
                                        <ChevronRight size={12} />
                                    </div>
                                </div>

                                {isInstalling && (
                                    <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 animate-pulse w-full" />
                                )}
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {/* Active Installation Log Console */}
            {Object.values(statuses).some(s => s.status === 'installing') && (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50"
                >
                    <div className="bg-[#0a0a16]/80 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="text-indigo-400" size={18} />
                                <h4 className="text-xs font-bold text-white uppercase tracking-widest">Installation Control Sequence</h4>
                            </div>
                            <span className="text-[9px] font-mono text-slate-600">ROBOFANG_SYS_V3</span>
                        </div>
                        <div className="h-32 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1 custom-scrollbar">
                            {Object.entries(statuses)
                                .filter(([, s]) => s.status === 'installing')
                                .flatMap(([id, s]) => s.logs.map(l => ({ id, msg: l })))
                                .map((log, i) => (
                                    <div key={i} className="flex gap-4">
                                        <span className="text-indigo-500 shrink-0">[{log.id}]</span>
                                        <span>{log.msg}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Installer;
