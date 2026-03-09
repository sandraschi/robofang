import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Download, Trash2, AlertCircle, Info,
    CheckCircle2, Clock, Terminal, BrainCircuit, FileText,
    Loader2, RefreshCw, Wifi, WifiOff,
} from 'lucide-react';

const BRIDGE = 'http://localhost:10865';
const POLL_INTERVAL_MS = 4_000; // live-tail poll every 4s

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    source: string;
    message: string;
    category: 'system' | 'mcp' | 'agent' | 'auth';
}

interface LogsMeta {
    buffer_size: number;
    buffer_used: number;
}

const Logger: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [meta, setMeta] = useState<LogsMeta | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [live, setLive] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const latestIdRef = useRef<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Full fetch (used on first load, manual refresh, clear)
    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await fetch(`${BRIDGE}/logs?limit=300`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const data = await r.json();
            const entries: LogEntry[] = data.logs ?? [];
            setLogs(entries);
            setMeta({ buffer_size: data.buffer_size, buffer_used: data.buffer_used });
            latestIdRef.current = data.latest_id ?? null;
        } catch (e) {
            setError('Bridge unreachable at :10865');
        } finally {
            setLoading(false);
        }
    }, []);

    // Incremental poll — only fetches new entries since last id
    const pollNew = useCallback(async () => {
        if (!live) return;
        try {
            const sinceParam = latestIdRef.current ? `&since_id=${latestIdRef.current}` : '';
            const r = await fetch(`${BRIDGE}/logs?limit=50${sinceParam}`);
            if (!r.ok) return;
            const data = await r.json();
            const newEntries: LogEntry[] = data.logs ?? [];
            if (newEntries.length > 0) {
                setLogs(prev => {
                    // Deduplicate by id and keep last 300
                    const combined = [...prev, ...newEntries];
                    const seen = new Set<string>();
                    const deduped = combined.filter(e => {
                        if (seen.has(e.id)) return false;
                        seen.add(e.id);
                        return true;
                    });
                    return deduped.slice(-300);
                });
                latestIdRef.current = data.latest_id ?? latestIdRef.current;
                setMeta({ buffer_size: data.buffer_size, buffer_used: data.buffer_used });
                // Auto-scroll to bottom
                setTimeout(() => {
                    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                }, 50);
            }
            setError(null);
        } catch {
            // Silent — show WifiOff indicator but don't blast the UI
            setError('Polling paused — bridge unreachable');
        }
    }, [live]);

    // Mount: full load + set up poll
    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    useEffect(() => {
        if (!live) return;
        const id = setInterval(pollNew, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [live, pollNew]);

    const handleClearLogs = async () => {
        try {
            await fetch(`${BRIDGE}/logs`, { method: 'DELETE' });
            setLogs([]);
            latestIdRef.current = null;
            setAiAnalysis(null);
        } catch {
            setError('Failed to clear logs');
        }
    };

    const handleExport = () => {
        const text = logs.map(l =>
            `[${l.timestamp}] ${l.level.toUpperCase().padEnd(5)} ${l.source.padEnd(20)} ${l.message}`
        ).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RoboFang-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleAiAnalysis = () => {
        setIsAnalyzing(true);
        // Summarise top error/warn messages as a local heuristic
        const errors = logs.filter(l => l.level === 'error');
        const warns = logs.filter(l => l.level === 'warn');
        const mcpIssues = logs.filter(l => l.category === 'mcp' && l.level !== 'info');

        setTimeout(() => {
            const summary = [
                errors.length > 0
                    ? `${errors.length} error(s) detected — latest: "${errors[errors.length - 1].message}"`
                    : 'No errors in ring buffer.',
                warns.length > 0
                    ? `${warns.length} warning(s) — check ${[...new Set(warns.map(w => w.source))].slice(0, 3).join(', ')}.`
                    : 'No warnings.',
                mcpIssues.length > 0
                    ? `${mcpIssues.length} MCP anomalies — possible connector downtime.`
                    : 'MCP layer looks clean.',
                `Buffer: ${meta?.buffer_used ?? logs.length}/${meta?.buffer_size ?? 300} entries.`,
            ].join(' ');
            setAiAnalysis(summary);
            setIsAnalyzing(false);
        }, 1200);
    };

    // Filtering
    const filtered = logs.filter(log => {
        const matchLevel = selectedLevel === 'all' || log.level === selectedLevel;
        const matchCat = selectedCategory === 'all' || log.category === selectedCategory;
        const matchSearch = !searchQuery ||
            log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchLevel && matchCat && matchSearch;
    });

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'info': return <Info size={14} className="text-blue-400" />;
            case 'warn': return <AlertCircle size={14} className="text-yellow-400" />;
            case 'error': return <AlertCircle size={14} className="text-red-400" />;
            case 'debug': return <Clock size={14} className="text-slate-500" />;
            default: return <CheckCircle2 size={14} className="text-green-400" />;
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'info': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'warn': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'error': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'debug': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
            default: return 'text-green-400 bg-green-400/10 border-green-400/20';
        }
    };

    return (
        <div className="page-grid">
            {/* Header */}
            <div className="lg:col-span-12 mb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 font-heading">
                        <Terminal className="text-emerald-400" />
                        Advanced Logger
                    </h1>
                    <p className="text-slate-400 mt-1 text-xs">
                        Live ring buffer via <span className="font-mono text-indigo-400">/logs</span> ·
                        {meta && <span className="ml-1">{meta.buffer_used}/{meta.buffer_size} entries · </span>}
                        polling every {POLL_INTERVAL_MS / 1000}s
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Live toggle */}
                    <button
                        onClick={() => setLive(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                            live
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
                        }`}
                    >
                        {live ? <Wifi size={14} /> : <WifiOff size={14} />}
                        {live ? 'Live' : 'Paused'}
                    </button>
                    <button
                        onClick={handleAiAnalysis}
                        disabled={isAnalyzing || logs.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-emerald-500/20"
                    >
                        <BrainCircuit size={14} className={isAnalyzing ? 'animate-pulse' : ''} />
                        {isAnalyzing ? 'Analyzing...' : 'AI Forensics'}
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={logs.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/5 transition-all font-bold text-[10px] uppercase tracking-wider disabled:opacity-50"
                    >
                        <Download size={14} />
                        Export
                    </button>
                    <button
                        onClick={fetchAll}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-50"
                        title="Full refresh"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="lg:col-span-12 flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* AI Insight */}
            <AnimatePresence>
                {aiAnalysis && (
                    <div className="lg:col-span-12">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="page-card border-emerald-400/30 bg-emerald-400/5 p-4 flex gap-4"
                        >
                            <div className="mt-1"><BrainCircuit className="text-emerald-400" /></div>
                            <div className="flex-1">
                                <h3 className="font-bold text-emerald-400 text-xs uppercase tracking-wider">AI Insight (local heuristic)</h3>
                                <p className="text-emerald-100/80 text-sm mt-1 leading-relaxed">{aiAnalysis}</p>
                                <button
                                    onClick={() => setAiAnalysis(null)}
                                    className="text-[10px] text-emerald-400/60 hover:text-emerald-400 mt-2 transition-colors underline uppercase font-bold tracking-wider"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Log panel */}
            <div className="lg:col-span-12">
                <div className="page-card h-[600px] flex flex-col p-0 overflow-hidden">
                    {/* Toolbar */}
                    <div className="card-header border-b border-white/5 p-4 flex flex-wrap items-center justify-between gap-4 bg-white/[0.02]">
                        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search source, message, category..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {/* Level filter */}
                            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                                {['all', 'info', 'warn', 'error', 'debug'].map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => setSelectedLevel(lvl)}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                                            selectedLevel === lvl
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                        }`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                            {/* Category filter */}
                            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                                {['all', 'system', 'mcp', 'agent', 'auth'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                                            selectedCategory === cat
                                                ? 'bg-purple-600 text-white shadow-lg'
                                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClearLogs}
                                className="p-2 text-slate-500 hover:text-rose-400 bg-white/5 hover:bg-rose-400/10 rounded-lg transition-all"
                                title="Clear ring buffer"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Log display */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto font-mono text-xs p-4 space-y-1 bg-black/20 scrollbar-thin scrollbar-thumb-white/10"
                    >
                        {loading && logs.length === 0 ? (
                            <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
                                <Loader2 className="animate-spin" size={16} />
                                Loading bridge logs...
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex items-center justify-center py-16 text-slate-500">
                                {logs.length === 0 ? 'No logs yet — bridge may be offline.' : 'No entries match current filter.'}
                            </div>
                        ) : (
                            filtered.map(log => (
                                <div
                                    key={log.id}
                                    className="group flex items-start gap-4 p-2 rounded-lg hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5"
                                >
                                    <div className="text-slate-600 whitespace-nowrap pt-0.5 w-[140px] text-[10px]">{log.timestamp}</div>
                                    <div className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase w-16 flex items-center justify-center gap-1.5 flex-shrink-0 ${getLevelColor(log.level)}`}>
                                        {getLevelIcon(log.level)}
                                        {log.level}
                                    </div>
                                    <div className="text-emerald-400 font-bold min-w-[90px] border-r border-white/5 pr-4 truncate">{log.source}</div>
                                    <div className="flex-1 text-slate-400">
                                        <span className="text-slate-200 group-hover:text-white transition-colors">{log.message}</span>
                                        <span className="ml-3 px-1.5 py-0.5 rounded-md bg-white/5 text-slate-600 text-[9px] uppercase font-bold tracking-wider">{log.category}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono tracking-wider">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-2">
                                <FileText size={12} className="text-indigo-500" />
                                {filtered.length} / {logs.length} entries shown
                            </span>
                            {meta && (
                                <span className="flex items-center gap-2">
                                    <Clock size={12} className="text-indigo-500" />
                                    Buffer: {meta.buffer_used}/{meta.buffer_size}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${live && !error ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            {live && !error ? 'Live Tail: Active' : 'Polling: Paused'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Logger;
