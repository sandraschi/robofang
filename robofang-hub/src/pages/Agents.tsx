import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Layers, Play, Pause, Zap, Shield, RefreshCw,
    AlertCircle, CheckCircle2, Bot, Gauge, Microscope
} from 'lucide-react';
import { getAgents, activateAgent, pauseAgent } from '../api/fleet';

interface AgentStatus {
    id: string;
    name: string;
    description: string;
    is_active: boolean;
    last_pulse_timestamp: number | null;
    error_count: number;
    tasks_completed: number;
}

const AgentCard: React.FC<{ agent: AgentStatus; onRefresh: () => void }> = ({ agent, onRefresh }) => {
    const [loading, setLoading] = useState(false);

    const toggle = async () => {
        setLoading(true);
        try {
            if (agent.is_active) {
                await pauseAgent(agent.id);
            } else {
                await activateAgent(agent.id);
            }
            onRefresh();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const statusGlow = agent.is_active ? 'shadow-[0_0_15px_rgba(52,211,153,0.3)]' : '';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-[#131320] border border-white/5 hover:border-white/10 rounded-3xl p-6 transition-all"
        >
            <div className="absolute top-4 right-4 text-white">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${agent.is_active
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${agent.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    {agent.is_active ? 'Active' : 'Paused'}
                </div>
            </div>

            <div className="flex items-start gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${agent.is_active
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 ' + statusGlow
                    : 'bg-slate-500/10 text-slate-500 border-slate-500/10'
                    }`}>
                    {agent.id.includes('robotics') ? <Bot size={28} /> :
                        agent.id.includes('collector') ? <Microscope size={28} /> :
                            <Layers size={28} />}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-heading font-bold text-white mb-1 truncate">{agent.name}</h3>
                    <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                        {agent.description}
                    </p>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 transition-colors group-hover:bg-white/[0.03]">
                    <div className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                        <CheckCircle2 size={10} className="text-indigo-400" />
                        Throughput
                    </div>
                    <div className="text-2xl font-mono font-bold text-white tracking-tight">
                        {agent.tasks_completed}
                    </div>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 transition-colors group-hover:bg-white/[0.03]">
                    <div className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                        <AlertCircle size={10} className="text-pink-400" />
                        Faults
                    </div>
                    <div className="text-2xl font-mono font-bold text-white tracking-tight">
                        {agent.error_count}
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Service Platform</span>
                    <span className="text-[11px] font-mono text-slate-400">{agent.id}</span>
                </div>
                <button
                    onClick={toggle}
                    disabled={loading}
                    className={`h-11 px-6 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${agent.is_active
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40'
                        }`}
                >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> :
                        agent.is_active ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    {agent.is_active ? 'Stop' : 'Engage'}
                </button>
            </div>
        </motion.div>
    );
};

const Agents: React.FC = () => {
    const [agents, setAgents] = useState<AgentStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getAgents();
            if (result.success) {
                setAgents(result.hands);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch agent services.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch();
        const timer = setInterval(() => {
            getAgents().then(res => { if (res.success) setAgents(res.hands); });
        }, 3000);
        return () => clearInterval(timer);
    }, [fetch]);

    return (
        <div className="max-w-7xl mx-auto space-y-10">
            <header className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-white">
                    <div className="px-3 py-1 rounded-full bg-indigo-500/11 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        Agent Services
                    </div>
                    <div className="h-px flex-1 bg-white/[0.06]" />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-5xl font-heading font-bold tracking-tight text-white mb-2">
                             Active <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Agents</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl font-medium">
                            Manage the persistent background agents driving continuous processing and hardware interfaces.
                        </p>
                    </div>
                    <button
                        onClick={fetch}
                        title="Refresh Autonomous Substrate"
                        className="p-4 bg-white/[0.03] border border-white/5 rounded-3xl text-slate-400 hover:text-white transition-all hover:bg-white/10 shadow-2xl"
                    >
                        <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="page-card p-6 flex items-center gap-4 bg-gradient-to-br from-indigo-500/11 to-transparent">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Zap size={20} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{agents.filter(a => a.is_active).length}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operational Agents</div>
                    </div>
                </div>
                <div className="page-card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Gauge size={20} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{agents.reduce((acc, a) => acc + a.tasks_completed, 0)}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Agent Activity</div>
                    </div>
                </div>
                <div className="page-card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                        <Shield size={20} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{agents.reduce((acc, a) => acc + a.error_count, 0)}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fault Latency</div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="page-card border-red-500/20 bg-red-500/5 p-8 flex items-center gap-5 text-red-400">
                    <AlertCircle size={24} />
                    <div>
                        <h4 className="font-bold">Service Desync</h4>
                        <p className="text-sm opacity-80">{error}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AnimatePresence>
                    {agents.map(agent => (
                        <AgentCard key={agent.id} agent={agent} onRefresh={fetch} />
                    ))}
                </AnimatePresence>
            </div>

            {!loading && agents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 opacity-20 text-white">
                    <Layers size={64} className="mb-4" />
                    <p className="font-bold uppercase tracking-widest text-sm">No Agents Registered</p>
                </div>
            )}
        </div>
    );
};

export default Agents;
