import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Database, Zap, RefreshCw, AlertTriangle,
    Clock, Radio, Server, WifiOff, RotateCcw,
    Play, Square, Terminal,
    CheckCircle2, Loader2, ToggleLeft, ToggleRight,
    ShieldAlert, Search, Cpu, Brain,
} from 'lucide-react';
import {
    getSystem, getSupervisorStatus, getSupervisorLogs,
    supervisorStart, supervisorStop, supervisorRestart,
    setSupervisorAutoRestart, getSubstrateHeartbeat, runFleetForensics, getFleetHealth,
} from '../api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SystemData {
    status: string;
    service: string;
    version: string;
    pid: number;
    uptime_seconds: number;
    started_at: number;
    memory_mb: number;
    connectors: Record<string, { online: boolean; type: string }>;
    connectors_online: number;
    connectors_total: number;
}

interface SupervisorStatus {
    state: 'running' | 'stopped' | 'crashed' | 'never_started';
    running: boolean;
    pid: number | null;
    exit_code: number | null;
    uptime_seconds: number | null;
    started_at: number | null;
    stopped_at: number | null;
    crash_count: number;
    auto_restart: boolean;
    log_lines: number;
    bridge_port: number;
    bridge_cmd: string;
}

interface SubstrateHeartbeat {
    status: string;
    integrity: string;
    council_active: boolean;
    fleet_node_count: number;
    system_pressure: { cpu_percent: number; memory_percent: number };
    heartbeat_latency_ms: number;
    timestamp: string;
}

interface Discovery {
    id: string;
    type: string;
    description: string;
    timestamp: number;
}

interface HealthReport {
    success: boolean;
    cohesion_score: number;
    risk_level: string;
    anomalies: string[];
    discoveries: Discovery[];
}

type BridgeState = 'loading' | 'online' | 'offline';
type SupervisorState = 'loading' | 'online' | 'offline';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUptime(seconds: number | null): string {
    if (seconds == null) return '—';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60) % 60;
    const h = Math.floor(seconds / 3600) % 24;
    const d = Math.floor(seconds / 86400);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${seconds % 60}s`;
}

function formatTime(epoch: number | null): string {
    if (!epoch) return '—';
    return new Date(epoch * 1000).toLocaleTimeString();
}

// ── Components ────────────────────────────────────────────────────────────────

const Tile: React.FC<{
    label: string; value: string; sub?: string;
    icon: React.ReactNode; color: string; live?: boolean;
}> = ({ label, value, sub, icon, color, live }) => {
    const C: Record<string, string> = {
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        red: 'bg-red-500/10 text-red-400 border-red-500/20',
        slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    };
    return (
        <div className="bg-[#16162a] border border-white/10 p-5 rounded-2xl flex items-start justify-between hover:border-white/20 transition-colors">
            <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{label}</span>
                    {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </div>
                <h3 className="text-2xl font-bold text-white truncate">{value}</h3>
                {sub && <div className="text-xs text-slate-400 font-mono truncate">{sub}</div>}
            </div>
            <div className={`p-3 rounded-xl border shrink-0 ml-3 ${C[color] ?? C.slate}`}>{icon}</div>
        </div>
    );
};

const BridgeBanner: React.FC<{
    bridgeState: BridgeState;
    supState: SupervisorState;
    supStatus: SupervisorStatus | null;
    lastSeen: Date | null;
    actionPending: string | null;
    onStart: () => void;
    onRetry: () => void;
}> = ({ bridgeState, supState, supStatus, lastSeen, actionPending, onStart, onRetry }) => {
    if (bridgeState === 'online') return null;

    const supOffline = supState === 'offline';
    const bridgeCrashed = supStatus?.state === 'crashed';
    const neverStarted = supStatus?.state === 'never_started';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/[0.07] p-5"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-red-900/15 to-transparent pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="mt-0.5 w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                            {actionPending
                                ? <Loader2 size={18} className="text-red-400 animate-spin" />
                                : <WifiOff size={18} className="text-red-400" />
                            }
                        </div>
                        <div>
                            <div className="text-base font-bold text-red-300">
                                {supOffline
                                    ? 'Supervisor not running'
                                    : bridgeCrashed
                                        ? `Bridge crashed (exit ${supStatus?.exit_code ?? '?'})`
                                        : neverStarted
                                            ? 'Bridge has never been started'
                                            : 'Bridge is stopped'
                                }
                            </div>
                            <div className="text-sm text-slate-400 mt-1">
                                {supOffline
                                    ? 'Start the supervisor: python -m RoboFang.supervisor'
                                    : 'Use the controls below to start the bridge.'
                                }
                            </div>
                            {supStatus?.crash_count ? (
                                <div className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                                    <AlertTriangle size={11} />
                                    {supStatus.crash_count} crash{supStatus.crash_count !== 1 ? 'es' : ''} recorded this session
                                </div>
                            ) : null}
                            {lastSeen && (
                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                    <Clock size={11} />
                                    Bridge last seen at {lastSeen.toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                        {!supOffline && (
                            <button
                                onClick={onStart}
                                disabled={!!actionPending}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Play size={14} />
                                Start Bridge
                            </button>
                        )}
                        <button
                            onClick={onRetry}
                            disabled={!!actionPending}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RotateCcw size={14} className={actionPending === 'poll' ? 'animate-spin' : ''} />
                            Retry Poll
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// ── Council Deliberation Visualization ────────────────────────────────────────

const CouncilPanel: React.FC<{ active: boolean }> = ({ active }) => {
    const agents = [
        { name: 'Schipal', role: 'Architect', status: active ? 'Thinking' : 'Offline', color: 'emerald' },
        { name: 'Benny', role: 'Security', status: active ? 'Guarding' : 'Asleep', color: 'blue' },
        { name: 'Steve', role: 'Redundancy', status: active ? 'Idle' : 'Offline', color: 'slate' },
        { name: 'Marion', role: 'Logic', status: active ? 'Validating' : 'Offline', color: 'purple' },
    ];

    return (
        <div className="bg-[#1a1a3a] border border-indigo-500/20 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.05)]">
            <div className="px-6 py-4 border-b border-indigo-500/10 flex items-center justify-between bg-indigo-500/[0.02]">
                <div className="flex items-center gap-3">
                    <Brain size={18} className="text-indigo-400" />
                    <div>
                        <h2 className="text-sm font-bold text-slate-100 italic">Council Deliberation</h2>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">
                            Status: <span className={active ? 'text-indigo-400' : 'text-slate-600'}>{active ? 'SYNCHRONIZED' : 'DORMANT'}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                    SOTA-2026
                </div>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {agents.map((agent) => (
                        <div key={agent.name} className="relative group">
                            <div className={`p-4 rounded-xl border border-white/[0.03] bg-black/20 flex flex-col items-center transition-all hover:border-${agent.color}-500/30 hover:bg-${agent.color}-500/[0.02]`}>
                                <div className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center border-2 ${active ? `border-${agent.color}-400/50` : 'border-slate-700'} bg-black/40 overflow-hidden`}>
                                    <svg viewBox="0 0 24 24" className={`w-8 h-8 ${active ? `text-${agent.color}-400` : 'text-slate-600'}`}>
                                        <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                                    </svg>
                                    {active && (
                                        <motion.div
                                            animate={{ opacity: [0.1, 0.4, 0.1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className={`absolute inset-0 bg-${agent.color}-400/10`}
                                        />
                                    )}
                                </div>
                                <span className="text-xs font-bold text-slate-200">{agent.name}</span>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter mb-1">{agent.role}</span>
                                <div className="flex items-center gap-1">
                                    <span className={`w-1 h-1 rounded-full ${active ? `bg-${agent.color}-400` : 'bg-slate-700'}`} />
                                    <span className={`text-[9px] font-mono ${active ? `text-${agent.color}-400/70` : 'text-slate-700'}`}>{agent.status}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ── Substrate Heartbeat Panel ────────────────────────────────────────────────

const SubstratePanel: React.FC<{
    heartbeat: SubstrateHeartbeat | null;
    loading: boolean;
    forensicPending: boolean;
    forensicResult: string | null;
    onRunForensics: () => void;
    healthReport: HealthReport | null;
}> = ({ heartbeat, loading, forensicPending, forensicResult, onRunForensics, healthReport }) => {
    return (
        <div className="bg-[#1a1a3a] border border-emerald-500/20 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.05)]">
            <div className="px-6 py-4 border-b border-emerald-500/10 flex items-center justify-between bg-emerald-500/[0.02]">
                <div className="flex items-center gap-3">
                    <ShieldAlert size={18} className="text-emerald-400" />
                    <div>
                        <h2 className="text-sm font-bold text-slate-100 italic">Sovereign Substrate Heartbeat</h2>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">
                            Status: <span className={heartbeat?.integrity === 'nominal' ? 'text-emerald-400' : 'text-amber-400'}>{heartbeat?.integrity ?? 'WAITING...'}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {loading && <Loader2 size={14} className="text-emerald-400 animate-spin" />}
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        AUTONOMIC
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Council', value: heartbeat?.council_active ? 'STABLE' : 'OFFLINE', icon: <Activity size={14} />, color: heartbeat?.council_active ? 'text-emerald-400' : 'text-red-400' },
                            { label: 'Fleet Nodes', value: heartbeat?.fleet_node_count ?? '—', icon: <Server size={14} />, color: 'text-blue-400' },
                            { label: 'Pressure', value: `${heartbeat?.system_pressure.cpu_percent ?? 0}%`, icon: <Cpu size={14} />, color: 'text-indigo-400' },
                            { label: 'Latency', value: `${heartbeat?.heartbeat_latency_ms ?? 0}ms`, icon: <Clock size={14} />, color: 'text-amber-400' },
                        ].map((m, i) => (
                            <div key={i} className="bg-black/30 border border-white/[0.05] rounded-xl p-4 group hover:border-white/10 transition-colors">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2 mb-2">
                                    {m.icon} {m.label}
                                </div>
                                <div className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="lg:col-span-4 flex flex-col justify-center gap-4 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl p-5">
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                                <Search size={14} /> Agentic Forensics
                            </h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                Trigger a reductionist triage sweep to analyze fleet-wide anomalies and cascading failures.
                            </p>
                        </div>
                        <button
                            onClick={onRunForensics}
                            disabled={forensicPending}
                            className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 ${forensicPending
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500/50 cursor-not-allowed'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300'
                                }`}
                        >
                            {forensicPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                            {forensicPending ? 'Analyzing Fleet...' : 'Initiate Forensic Pass'}
                        </button>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-emerald-500/10 pt-8">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <Zap size={14} className="text-amber-400" /> Autonomous Discoveries
                            </h4>
                            <span className="text-[10px] font-mono text-slate-500">{healthReport?.discoveries?.length ?? 0} found</span>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar text-xs">
                            {healthReport?.discoveries?.map((discovery) => (
                                <div key={discovery.id} className="bg-black/20 border border-white/[0.03] rounded-xl p-3 flex items-start gap-4 hover:border-emerald-500/20 transition-all group">
                                    <div className={`mt-1 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors`}>
                                        <Brain size={12} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-tighter">{discovery.type}</span>
                                            <span className="text-[8px] font-mono text-slate-600 tracking-tighter">{new Date(discovery.timestamp * 1000).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-snug line-clamp-2">{discovery.description}</p>
                                    </div>
                                </div>
                            ))}
                            {(!healthReport?.discoveries || healthReport.discoveries.length === 0) && (
                                <div className="text-center py-12 bg-black/10 border border-dashed border-white/5 rounded-2xl">
                                    <p className="text-[10px] text-slate-600 font-medium">Scanning for autonomous tool expansions...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert size={14} className="text-red-400" /> Substrate Anomalies
                        </h4>
                        <div className="bg-black/30 border border-red-500/10 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/[0.03] flex items-center justify-between bg-red-500/[0.02]">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Risk Level</span>
                                <span className={`text-[10px] font-bold uppercase py-0.5 px-2 rounded-full ${healthReport?.risk_level === 'nominal' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {healthReport?.risk_level ?? 'UNCERTAIN'}
                                </span>
                            </div>
                            <div className="p-4 space-y-3">
                                {healthReport?.anomalies?.map((anomaly, i) => (
                                    <div key={i} className="flex items-start gap-3 text-xs text-red-300/80 bg-red-500/[0.03] p-2 rounded-lg border border-red-500/10">
                                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                        {anomaly}
                                    </div>
                                ))}
                                {(!healthReport?.anomalies || healthReport.anomalies.length === 0) && (
                                    <div className="flex items-center gap-2 text-xs text-emerald-400/80 bg-emerald-500/[0.03] p-3 rounded-lg border border-emerald-500/10">
                                        <CheckCircle2 size={14} />
                                        All nodes verified. Pulse integrity at 100%.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {forensicResult && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-6 pt-6 border-t border-emerald-500/10"
                        >
                            <div className="bg-black/40 rounded-xl p-5 border border-emerald-500/20 font-mono text-xs text-emerald-300/90 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                                <div className="text-emerald-500/50 text-[10px] uppercase font-bold mb-3 flex items-center gap-2">
                                    <Terminal size={12} /> Forensic Intelligence Report
                                </div>
                                {forensicResult}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const SupervisorPanel: React.FC<{
    supState: SupervisorState;
    supStatus: SupervisorStatus | null;
    actionPending: string | null;
    onStart: () => void;
    onStop: () => void;
    onRestart: () => void;
    onToggleAutoRestart: () => void;
}> = ({ supState, supStatus, actionPending, onStart, onStop, onRestart, onToggleAutoRestart }) => {
    const running = supStatus?.running ?? false;

    return (
        <div className="bg-[#16162a] border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Server size={16} className="text-indigo-400" />
                    <h2 className="text-sm font-bold text-slate-200">Bridge Process Control</h2>
                    <span className="text-[10px] font-mono text-slate-500">via supervisor :10866</span>
                </div>
                {supState === 'offline' && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                        <AlertTriangle size={11} />
                        Supervisor offline
                    </span>
                )}
                {supState === 'online' && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                        <CheckCircle2 size={11} />
                        Supervisor online
                    </span>
                )}
            </div>

            <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {[
                        { label: 'State', value: supStatus?.state ?? '—', color: running ? 'text-emerald-400' : supStatus?.state === 'crashed' ? 'text-red-400' : 'text-slate-400' },
                        { label: 'PID', value: supStatus?.pid ? String(supStatus.pid) : '—', color: 'text-slate-300' },
                        { label: 'Uptime', value: formatUptime(supStatus?.uptime_seconds ?? null), color: 'text-slate-300' },
                        { label: 'Crashes', value: String(supStatus?.crash_count ?? 0), color: (supStatus?.crash_count ?? 0) > 0 ? 'text-amber-400' : 'text-slate-400' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-[#0d0d16] border border-white/[0.07] rounded-xl p-3">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{label}</div>
                            <div className={`font-mono font-bold ${color}`}>{value}</div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={onStart}
                        disabled={!!actionPending || running || supState !== 'online'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
                    >
                        {actionPending === 'start' ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                        Start
                    </button>
                    <button
                        onClick={onStop}
                        disabled={!!actionPending || !running || supState !== 'online'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
                    >
                        {actionPending === 'stop' ? <Loader2 size={13} className="animate-spin" /> : <Square size={13} />}
                        Stop
                    </button>
                    <button
                        onClick={onRestart}
                        disabled={!!actionPending || supState !== 'online'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
                    >
                        {actionPending === 'restart' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        Restart
                    </button>
                    <button
                        onClick={onToggleAutoRestart}
                        disabled={!!actionPending || supState !== 'online'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ml-auto"
                    >
                        {supStatus?.auto_restart ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} className="text-slate-500" />}
                        Auto-Restart
                    </button>
                </div>
            </div>
        </div>
    );
};

const LogViewer: React.FC<{
    supState: SupervisorState;
    lines: string[];
    loading: boolean;
    onRefresh: () => void;
}> = ({ supState, lines, loading, onRefresh }) => {
    const [expanded, setExpanded] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [lines]);

    const visibleLines = expanded ? lines : lines.slice(-15);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal size={16} className="text-indigo-400" />
                    <h2 className="text-sm font-bold text-white">Execution Journal</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setExpanded(!expanded)} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
                        {expanded ? 'Show Less' : `Show All (${lines.length})`}
                    </button>
                    <button
                        onClick={onRefresh}
                        disabled={loading || supState !== 'online'}
                        title="Refresh Execution Journal"
                        className="p-1.5 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 transition-colors disabled:opacity-30"
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className={`bg-black/40 border border-white/10 rounded-2xl overflow-hidden font-mono text-[11px] transition-all duration-300 ${expanded ? 'h-[600px]' : 'h-[300px]'}`}>
                <div className="h-full overflow-y-auto p-5 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                    {visibleLines.length > 0 ? (
                        <>
                            {visibleLines.map((line, i) => (
                                <div key={i} className="py-0.5 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02] transition-colors flex gap-4">
                                    <span className="text-slate-600 shrink-0 w-4 text-right">{i + 1}</span>
                                    <span className={`${line.includes('ERROR') ? 'text-red-400' : line.includes('WARN') ? 'text-amber-400' : line.includes('SUCCESS') ? 'text-emerald-400' : 'text-slate-300'}`}>
                                        {line}
                                    </span>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 opacity-50">
                            <Terminal size={24} />
                            <span>No log entries available. Journal is empty.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ConnectorRow: React.FC<{ name: string; info: { online: boolean; type: string } }> = ({ name, info }) => (
    <tr className="hover:bg-white/[0.02] transition-colors group">
        <td className="px-6 py-4">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${info.online ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-500'}`}>
                    <Database size={14} />
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-200 truncate">{name}</div>
                    <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{info.type}</div>
                </div>
            </div>
        </td>
        <td className="px-6 py-4 text-xs text-slate-400 font-mono uppercase tracking-widest">{info.type}</td>
        <td className="px-6 py-4">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${info.online ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${info.online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                {info.online ? 'Online' : 'Offline'}
            </div>
        </td>
    </tr>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const Status: React.FC = () => {
    const [bridgeData, setBridgeData] = useState<SystemData | null>(null);
    const [bridgeState, setBridgeState] = useState<BridgeState>('loading');
    const [bridgeLastSeen, setBridgeLastSeen] = useState<Date | null>(null);
    const [supStatus, setSupStatus] = useState<SupervisorStatus | null>(null);
    const [supState, setSupState] = useState<SupervisorState>('loading');
    const [hbLoading, setHbLoading] = useState(false);
    const [heartbeat, setHeartbeat] = useState<SubstrateHeartbeat | null>(null);
    const [forensicPending, setForensicPending] = useState(false);
    const [forensicResult, setForensicResult] = useState<string | null>(null);
    const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
    const [logLines, setLogLines] = useState<string[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [actionPending, setActionPending] = useState<string | null>(null);

    const isStale = bridgeState === 'offline' && bridgeLastSeen !== null;

    const pollBridge = useCallback(async () => {
        try {
            const data = await getSystem();
            if (data.status === 'ok') {
                setBridgeData(data as unknown as SystemData);
                setBridgeState('online');
                setBridgeLastSeen(new Date());
            }
        } catch (error) {
            setBridgeState('offline');
            console.error('Bridge poll failed', error);
        }
    }, []);

    const pollSupervisor = useCallback(async () => {
        try {
            const status = await getSupervisorStatus();
            setSupStatus(status);
            setSupState('online');
        } catch (error) {
            setSupStatus(null);
            setSupState('offline');
            console.error('Supervisor poll failed', error);
        }
    }, []);

    const pollHb = useCallback(async () => {
        setHbLoading(true);
        try {
            const hb = await getSubstrateHeartbeat();
            setHeartbeat(hb);
            const health = await getFleetHealth();
            setHealthReport(health);
        } catch (e) {
            console.error('Pulse poll failed', e);
        } finally {
            setHbLoading(false);
        }
    }, []);

        try {
            const res = await getSupervisorLogs(100);
            if (res && res.success && Array.isArray(res.lines)) {
                setLogLines(res.lines);
            } else if (Array.isArray(res)) {
                setLogLines(res);
            }
        } catch (e) {
            console.error('Log fetch failed', e);
        } finally {
            setLogsLoading(false);
        }
    }, []);

    useEffect(() => {
        pollBridge();
        pollSupervisor();
        pollHb();
        refreshLogs();

        const timer = setInterval(() => {
            pollBridge();
            pollSupervisor();
            pollHb();
        }, 3000);

        return () => clearInterval(timer);
    }, [pollBridge, pollSupervisor, pollHb, refreshLogs]);

    const doStart = async () => {
        setActionPending('start');
        try {
            await supervisorStart();
            await pollSupervisor();
            setTimeout(pollBridge, 1000);
        } finally {
            setActionPending(null);
        }
    };

    const doStop = async () => {
        if (!confirm('Halt bridge process? This will terminate all active connectors.')) return;
        setActionPending('stop');
        try {
            await supervisorStop();
            await pollSupervisor();
            setBridgeState('offline');
        } finally {
            setActionPending(null);
        }
    };

    const doRestart = async () => {
        setActionPending('restart');
        try {
            await supervisorRestart();
            await pollSupervisor();
            setTimeout(pollBridge, 2000);
        } finally {
            setActionPending(null);
        }
    };

    const doToggleAutoRestart = async () => {
        if (!supStatus) return;
        setActionPending('toggle');
        try {
            await setSupervisorAutoRestart(!supStatus.auto_restart);
            await pollSupervisor();
        } finally {
            setActionPending(null);
        }
    };

    const doRunForensics = async () => {
        setForensicPending(true);
        setForensicResult(null);
        try {
            const res = await runFleetForensics();
            setForensicResult(res.analysis);
            await pollHb();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown protocol failure.';
            setForensicResult(`ERROR: Forensic sweep aborted. ${message}`);
        } finally {
            setForensicPending(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        Substrate Operations
                        <span className="text-xs font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full uppercase tracking-tighter">
                            PROD/SOTA
                        </span>
                    </h1>
                    <p className="text-slate-400 mt-1 max-w-2xl">
                        Real-time bridge observability, sovereign substrate heartbeat, and agentic forensics.
                    </p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center">
                    {bridgeState === 'online' ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-400/10 border border-emerald-400/25 rounded-full">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Bridge Online</span>
                        </div>
                    ) : bridgeState === 'loading' ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-400/10 border border-amber-400/25 rounded-full">
                            <RefreshCw size={11} className="text-amber-400 animate-spin" />
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Connecting</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-400/10 border border-red-400/25 rounded-full">
                            <div className="w-2 h-2 bg-red-400 rounded-full" />
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Bridge Down</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Bridge down banner */}
            <BridgeBanner
                bridgeState={bridgeState}
                supState={supState}
                supStatus={supStatus}
                lastSeen={bridgeLastSeen}
                actionPending={actionPending}
                onStart={doStart}
                onRetry={pollBridge}
            />

            {/* Stale data warning */}
            {isStale && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-300">
                    <AlertTriangle size={13} />
                    Showing last known data from {bridgeLastSeen?.toLocaleTimeString()} — bridge is currently unreachable.
                </div>
            )}

            {/* Substrate Heartbeat (SOTA-2026) */}
            <SubstratePanel
                heartbeat={heartbeat}
                loading={hbLoading}
                forensicPending={forensicPending}
                forensicResult={forensicResult}
                onRunForensics={doRunForensics}
                healthReport={healthReport}
            />

            {/* Council Deliberation Visualization */}
            <CouncilPanel active={heartbeat?.council_active ?? false} />

            {/* Metric tiles */}
            {bridgeData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Tile label="Bridge Uptime" value={formatUptime(bridgeData.uptime_seconds)}
                        sub={`Started ${formatTime(bridgeData.started_at)}`}
                        icon={<Zap size={20} />} color="emerald" live={bridgeState === 'online'} />
                    <Tile label="Memory" value={`${bridgeData.memory_mb} MB`}
                        sub="Bridge process RSS"
                        icon={<Database size={20} />} color="blue" live={bridgeState === 'online'} />
                    <Tile label="Connectors" value={`${bridgeData.connectors_online} / ${bridgeData.connectors_total}`}
                        sub="Online / Total"
                        icon={<Radio size={20} />}
                        color={bridgeData.connectors_online > 0 ? 'emerald' : 'red'}
                        live={bridgeState === 'online'} />
                    <Tile label="PID" value={String(bridgeData.pid)}
                        sub={`v${bridgeData.version}`}
                        icon={<Server size={20} />} color="purple" live={bridgeState === 'online'} />
                </div>
            )}

            {/* Loading skeleton */}
            {!bridgeData && bridgeState === 'loading' && (
                <div className="flex items-center justify-center py-12 text-slate-500 gap-3">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="text-sm">Querying bridge…</span>
                </div>
            )}

            {/* Supervisor control panel — always shown */}
            <SupervisorPanel
                supState={supState}
                supStatus={supStatus}
                actionPending={actionPending}
                onStart={doStart}
                onStop={doStop}
                onRestart={doRestart}
                onToggleAutoRestart={doToggleAutoRestart}
            />

            {/* Connector table — shown when bridge has data */}
            {bridgeData && Object.keys(bridgeData.connectors).length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Radio size={16} className="text-indigo-400" />
                        Registered Connectors
                        <span className="text-sm font-normal text-slate-500 ml-1">
                            {bridgeData.connectors_online} online · {bridgeData.connectors_total - bridgeData.connectors_online} offline
                        </span>
                    </h2>
                    <div className="bg-[#16162a] border border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/[0.03] border-b border-white/10 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Connector</th>
                                    <th className="px-6 py-3 font-medium">Type</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.06]">
                                {Object.entries(bridgeData.connectors)
                                    .sort(([, a], [, b]) => Number(b.online) - Number(a.online))
                                    .map(([name, info]) => (
                                        <ConnectorRow key={name} name={name} info={info} />
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Log viewer — shown when supervisor is online */}
            <LogViewer
                supState={supState}
                lines={logLines}
                loading={logsLoading}
                onRefresh={refreshLogs}
            />
        </div>
    );
};

export default Status;
