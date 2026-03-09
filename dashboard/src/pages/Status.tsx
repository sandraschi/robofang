import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Database, Zap, RefreshCw, AlertTriangle,
    Clock, Radio, Server, WifiOff, RotateCcw,
    Play, Square, Terminal, ChevronDown,
    CheckCircle2, Loader2, ToggleLeft, ToggleRight,
    ShieldAlert, Search, Cpu,
} from 'lucide-react';
import {
    getSystem, getSupervisorStatus, getSupervisorLogs,
    supervisorStart, supervisorStop, supervisorRestart,
    setSupervisorAutoRestart, getSubstrateHeartbeat, runFleetForensics,
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
    council_active: boolean;
    fleet_node_count: number;
    system_pressure: { cpu_percent: number; memory_percent: number };
    heartbeat_latency_ms: number;
    timestamp: string;
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

// ── Metric Tile ───────────────────────────────────────────────────────────────

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

// ── Bridge Status Banner ──────────────────────────────────────────────────────

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

// ── Substrate Heartbeat Panel (SOTA-2026) ───────────────────────────────────

const SubstratePanel: React.FC<{
    heartbeat: SubstrateHeartbeat | null;
    loading: boolean;
    forensicPending: boolean;
    forensicResult: string | null;
    onRunForensics: () => void;
}> = ({ heartbeat, loading, forensicPending, forensicResult, onRunForensics }) => {
    return (
        <div className="bg-[#1a1a3a] border border-emerald-500/20 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.05)]">
            <div className="px-6 py-4 border-b border-emerald-500/10 flex items-center justify-between bg-emerald-500/[0.02]">
                <div className="flex items-center gap-3">
                    <ShieldAlert size={18} className="text-emerald-400" />
                    <div>
                        <h2 className="text-sm font-bold text-slate-100 italic">Sovereign Substrate Heartbeat</h2>
                        <p className="text-[10px] text-slate-500 font-mono">Status: {heartbeat?.status ?? 'WAITING...'}</p>
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
                    {/* Metrics Section */}
                    <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            {
                                label: 'Council', value: heartbeat?.council_active ? 'STABLE' : 'OFFLINE',
                                icon: <Activity size={14} />, color: heartbeat?.council_active ? 'text-emerald-400' : 'text-red-400'
                            },
                            {
                                label: 'Fleet Nodes', value: heartbeat?.fleet_node_count ?? '—',
                                icon: <Server size={14} />, color: 'text-blue-400'
                            },
                            {
                                label: 'Pressure', value: `${heartbeat?.system_pressure.cpu_percent ?? 0}%`,
                                icon: <Cpu size={14} />, color: 'text-indigo-400'
                            },
                            {
                                label: 'Latency', value: `${heartbeat?.heartbeat_latency_ms ?? 0}ms`,
                                icon: <Clock size={14} />, color: 'text-amber-400'
                            },
                        ].map((m, i) => (
                            <div key={i} className="bg-black/30 border border-white/[0.05] rounded-xl p-4 group hover:border-white/10 transition-colors">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2 mb-2">
                                    {m.icon} {m.label}
                                </div>
                                <div className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Forensic Action Section */}
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

                {/* Forensic Results Display */}
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

// ── Supervisor Control Panel ──────────────────────────────────────────────────

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
                {/* Bridge state summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {[
                        {
                            label: 'State', value: supStatus?.state ?? '—',
                            color: running ? 'text-emerald-400' : supStatus?.state === 'crashed' ? 'text-red-400' : 'text-slate-400'
                        },
                        { label: 'PID', value: supStatus?.pid ? String(supStatus.pid) : '—', color: 'text-slate-300' },
                        { label: 'Uptime', value: formatUptime(supStatus?.uptime_seconds ?? null), color: 'text-slate-300' },
                        {
                            label: 'Crashes', value: String(supStatus?.crash_count ?? 0),
                            color: (supStatus?.crash_count ?? 0) > 0 ? 'text-amber-400' : 'text-slate-400'
                        },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-[#0d0d16] border border-white/[0.07] rounded-xl p-3">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{label}</div>
                            <div className={`font-mono font-bold ${color}`}>{value}</div>
                        </div>
                    ))}
                </div>

                {/* Control buttons */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={onStart}
                        disabled={!!actionPending || running || supState !== 'online'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
                    >
                        {actionPending === 'start'
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Play size={13} />
                        }
                        Start
                    </button>
                    <button
                        onClick={onStop}
                        disabled={!!actionPending || !running || supState !== 'online'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
                    >
                        {actionPending === 'stop'
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Square size={13} />
                        }
                        Stop
                    </button>
                    <button
                        onClick={onRestart}
                        disabled={!!actionPending || supState !== 'online'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
                    >
                        {actionPending === 'restart'
                            ? <Loader2 size={13} className="animate-spin" />
                            : <RefreshCw size={13} />
                        }
                        Restart
                    </button>

                    {/* Auto-restart toggle */}
                    <button
                        onClick={onToggleAutoRestart}
                        disabled={supState !== 'online'}
                        className={`ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 ${supStatus?.auto_restart
                            ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
                            : 'bg-white/[0.05] border border-white/10 text-slate-400'
                            }`}
                    >
                        {supStatus?.auto_restart
                            ? <ToggleRight size={14} />
                            : <ToggleLeft size={14} />
                        }
                        Auto-restart {supStatus?.auto_restart ? 'ON' : 'OFF'}
                    </button>
                </div>

                {/* Bridge command */}
                {supStatus?.bridge_cmd && (
                    <div className="text-[10px] font-mono text-slate-600 flex items-center gap-2">
                        <Terminal size={10} />
                        {supStatus.bridge_cmd}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Log Viewer ────────────────────────────────────────────────────────────────

const LogViewer: React.FC<{
    supState: SupervisorState;
    lines: string[];
    loading: boolean;
    onRefresh: () => void;
}> = ({ supState, lines, loading, onRefresh }) => {
    const [expanded, setExpanded] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (expanded && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [lines, expanded]);

    const visibleLines = expanded ? lines : lines.slice(-20);

    return (
        <div className="bg-[#16162a] border border-white/10 rounded-2xl overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? "Collapse Logs" : "Expand Logs"}
                title={expanded ? "Collapse Logs" : "Expand Logs"}
                className="w-full px-6 py-4 border-b border-white/[0.06] flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Terminal size={16} className="text-slate-400" />
                    <h2 className="text-sm font-bold text-slate-200">Bridge Logs</h2>
                    <span className="text-[10px] font-mono text-slate-500">{lines.length} lines in buffer</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                        disabled={loading || supState !== 'online'}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40"
                        title="Refresh"
                        aria-label="Refresh"
                    >
                        <RefreshCw size={12} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <ChevronDown
                        size={16}
                        className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {expanded && (
                <div className="bg-black/40 max-h-96 overflow-y-auto p-4 font-mono text-xs text-slate-300 space-y-0.5">
                    {lines.length === 0 ? (
                        <div className="text-slate-600 italic py-4 text-center">No log output yet.</div>
                    ) : (
                        visibleLines.map((line, i) => {
                            const isError = /error|exception|traceback/i.test(line);
                            const isWarning = /warn/i.test(line);
                            const isSup = line.startsWith('[supervisor]');
                            return (
                                <div
                                    key={i}
                                    className={`leading-relaxed px-2 py-0.5 rounded ${isError ? 'text-red-300 bg-red-500/[0.06]' :
                                        isWarning ? 'text-amber-300 bg-amber-500/[0.04]' :
                                            isSup ? 'text-indigo-300' :
                                                'text-slate-400'
                                        }`}
                                >
                                    {line || '\u00A0'}
                                </div>
                            );
                        })
                    )}
                    <div ref={bottomRef} />
                </div>
            )}

            {!expanded && lines.length > 0 && (
                <div className="px-4 py-2 bg-black/20 font-mono text-[11px] text-slate-500 truncate">
                    {lines[lines.length - 1]}
                </div>
            )}
        </div>
    );
};

// ── Connector Table ───────────────────────────────────────────────────────────

const ConnectorRow: React.FC<{ name: string; info: { online: boolean; type: string } }> = ({ name, info }) => (
    <tr className="hover:bg-white/[0.03] transition-colors">
        <td className="px-6 py-3.5">
            <div className="flex items-center gap-3">
                <Radio size={13} className="text-slate-500 shrink-0" />
                <span className="font-medium text-slate-100 text-sm">{name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
            </div>
        </td>
        <td className="px-6 py-3.5 text-[10px] font-mono text-slate-500 uppercase">{info.type}</td>
        <td className="px-6 py-3.5">
            {info.online ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-slate-500/15 text-slate-500 border border-slate-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" /> Offline
                </span>
            )}
        </td>
    </tr>
);

// ── Main ──────────────────────────────────────────────────────────────────────

const POLL_BRIDGE_MS = 5000;
const POLL_SUP_MS = 3000;

const Status: React.FC = () => {
    // Bridge state
    const [bridgeState, setBridgeState] = useState<BridgeState>('loading');
    const [bridgeData, setBridgeData] = useState<SystemData | null>(null);
    const [bridgeLastSeen, setBridgeLastSeen] = useState<Date | null>(null);
    const [bridgeLastPolled, setBridgeLastPolled] = useState<Date | null>(null);

    // Supervisor state
    const [supState, setSupState] = useState<SupervisorState>('loading');
    const [supStatus, setSupStatus] = useState<SupervisorStatus | null>(null);

    // Log viewer
    const [logLines, setLogLines] = useState<string[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // In-flight action
    const [actionPending, setActionPending] = useState<string | null>(null);

    // Diagnostic state
    const [heartbeat, setHeartbeat] = useState<SubstrateHeartbeat | null>(null);
    const [hbLoading, setHbLoading] = useState(false);
    const [forensicPending, setForensicPending] = useState(false);
    const [forensicResult, setForensicResult] = useState<string | null>(null);

    // ── Pollers ─────────────────────────────────────────────────────────────

    const pollSubstrate = useCallback(async () => {
        setHbLoading(true);
        try {
            const result = await getSubstrateHeartbeat();
            setHeartbeat(result);
        } catch { /* noop */ }
        setHbLoading(false);
    }, []);

    const pollBridge = useCallback(async () => {
        try {
            const result: SystemData = await getSystem();
            setBridgeData(result);
            setBridgeState('online');
            setBridgeLastSeen(new Date());
        } catch {
            setBridgeState(prev => prev === 'loading' ? 'offline' : 'offline');
        }
        setBridgeLastPolled(new Date());
    }, []);

    const pollSupervisor = useCallback(async () => {
        try {
            const result = await getSupervisorStatus();
            setSupStatus(result);
            setSupState('online');
        } catch {
            setSupState('offline');
            setSupStatus(null);
        }
    }, []);

    const refreshLogs = useCallback(async () => {
        if (supState !== 'online') return;
        setLogsLoading(true);
        try {
            const r = await getSupervisorLogs(200);
            setLogLines(r.lines ?? []);
        } catch { /* noop */ }
        setLogsLoading(false);
    }, [supState]);

    useEffect(() => {
        pollBridge();
        pollSupervisor();
        pollSubstrate();
        const b = setInterval(pollBridge, POLL_BRIDGE_MS);
        const s = setInterval(pollSupervisor, POLL_SUP_MS);
        const d = setInterval(pollSubstrate, POLL_BRIDGE_MS * 2);
        return () => { clearInterval(b); clearInterval(s); clearInterval(d); };
    }, [pollBridge, pollSupervisor, pollSubstrate]);

    // Refresh logs whenever supervisor state changes
    useEffect(() => {
        if (supState === 'online') refreshLogs();
    }, [supState, supStatus?.state]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Actions ──────────────────────────────────────────────────────────────

    const doStart = async () => {
        setActionPending('start');
        try {
            await supervisorStart();
            await new Promise(r => setTimeout(r, 2000));
            await pollBridge();
            await pollSupervisor();
        } finally { setActionPending(null); }
    };

    const doStop = async () => {
        setActionPending('stop');
        try {
            await supervisorStop();
            await new Promise(r => setTimeout(r, 1000));
            await pollBridge();
            await pollSupervisor();
        } finally { setActionPending(null); }
    };

    const doRestart = async () => {
        setActionPending('restart');
        try {
            await supervisorRestart();
            await new Promise(r => setTimeout(r, 3000));
            await pollBridge();
            await pollSupervisor();
        } finally { setActionPending(null); }
    };

    const doRetry = async () => {
        setActionPending('poll');
        await pollBridge();
        await pollSupervisor();
        setActionPending(null);
    };

    const doToggleAutoRestart = async () => {
        if (!supStatus) return;
        try {
            await setSupervisorAutoRestart(!supStatus.auto_restart);
            await pollSupervisor();
        } catch { /* noop */ }
    };

    const doRunForensics = async () => {
        setForensicPending(true);
        setForensicResult(null);
        try {
            const r = await runFleetForensics();
            setForensicResult(r.message || "Forensic sweep initiated successfully.");
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setForensicResult(`FORENSIC_FAILURE: ${msg}`);
        } finally {
            setForensicPending(false);
        }
    };

    const isStale = bridgeState === 'offline' && bridgeData !== null;

    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <header className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Activity className="text-emerald-400" />
                        System Status
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Live bridge health, process control, and connector states.
                        {bridgeLastPolled && (
                            <span className="text-slate-600 ml-2 font-mono text-xs">
                                Polled {bridgeLastPolled.toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={doRetry}
                        disabled={!!actionPending}
                        className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={actionPending === 'poll' ? 'animate-spin' : ''} />
                        Refresh
                    </button>

                    {/* Bridge status pill */}
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
            {bridgeState !== 'online' && (
                <BridgeBanner
                    bridgeState={bridgeState}
                    supState={supState}
                    supStatus={supStatus}
                    lastSeen={bridgeLastSeen}
                    actionPending={actionPending}
                    onStart={doStart}
                    onRetry={doRetry}
                />
            )}

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
            />

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
