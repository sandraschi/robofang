import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Terminal, Search, Download, Trash2, Wifi, WifiOff,
    BrainCircuit
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const BRIDGE_BASE_URL = 'http://localhost:10871';
const POLL_INTERVAL_MS = 4000;

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    source: string;
    message: string;
    category: 'system' | 'mcp' | 'agent' | 'auth';
}
const Logs: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [live, setLive] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('all');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    const latestIdRef = useRef<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const resp = await fetch(`${BRIDGE_BASE_URL}/logs?limit=300`);
            const data = await resp.json();
            setLogs(data.logs || []);
            latestIdRef.current = data.latest_id || null;
        } catch (err) {
            console.warn('Bridge unreachable, using mockup logs');
            setLogs([
                { id: '1', timestamp: new Date().toISOString(), level: 'info', source: 'SYSTEM', message: 'Substrate initialized successfully.', category: 'system' },
                { id: '2', timestamp: new Date().toISOString(), level: 'warn', source: 'MCP_BRIDGE', message: 'Latency spike detected in local-mcp-server.', category: 'mcp' },
                { id: '3', timestamp: new Date().toISOString(), level: 'error', source: 'AUTH_NODE', message: 'Failed handshake with remote peer.', category: 'auth' },
            ]);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const pollNew = useCallback(async () => {
        if (!live) return;
        try {
            const since = latestIdRef.current ? `&since_id=${latestIdRef.current}` : '';
            const resp = await fetch(`${BRIDGE_BASE_URL}/logs?limit=50${since}`);
            const data = await resp.json();
            if (data.logs && data.logs.length > 0) {
                setLogs(prev => [...prev, ...data.logs].slice(-300));
                latestIdRef.current = data.latest_id;
            }
        } catch (err) {
            // silent fail
        }
    }, [live]);

    useEffect(() => {
        const id = setInterval(pollNew, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [pollNew]);

    const filtered = logs.filter(log => {
        const matchLvl = selectedLevel === 'all' || log.level === selectedLevel;
        const matchSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.source.toLowerCase().includes(searchQuery.toLowerCase());
        return matchLvl && matchSearch;
    });

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                            <Terminal size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">System Logs</h1>
                    </div>
                    <p className="text-zinc-400 text-sm max-w-xl font-medium">
                        Real-time telemetry stream from the RoboFang substrate.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setLive(!live)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                            live ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-zinc-500'
                        }`}
                    >
                        {live ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
                        {live ? 'Live' : 'Paused'}
                    </button>
                    <button 
                        onClick={() => setIsAnalyzing(!isAnalyzing)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl border border-blue-400/20 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all"
                    >
                        <BrainCircuit size={14} />
                        AI Analysis
                    </button>
                    <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all">
                        <Download size={16} />
                    </button>
                </div>
            </header>

            <GlassCard className="h-[600px] flex flex-col overflow-hidden">
                {/* Log Toolbar */}
                <div className="p-4 border-b border-white/5 bg-white/[0.02] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                            <input 
                                type="text"
                                placeholder="FILTER_STREAM..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-cyan-500/50 transition-all"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl border border-white/5">
                            {['all', 'info', 'warn', 'error'].map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => setSelectedLevel(lvl)}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                        selectedLevel === lvl ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'
                                    }`}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <button className="p-2 text-zinc-600 hover:text-rose-400 transition-colors">
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Log Stream */}
                <div className="flex-1 overflow-y-auto font-mono p-4 space-y-1 bg-black/40">
                    {filtered.map((log) => (
                        <div key={log.id} className="flex gap-4 p-2 rounded-lg hover:bg-white/[0.03] group transition-all border border-transparent hover:border-white/5">
                            <span className="text-[10px] text-zinc-600 w-32 shrink-0">{log.timestamp.split('T')[1].split('.')[0]}</span>
                            <span className={`text-[10px] font-black uppercase w-16 shrink-0 ${
                                log.level === 'error' ? 'text-rose-400' :
                                log.level === 'warn' ? 'text-amber-400' :
                                'text-blue-400'
                            }`}>{log.level}</span>
                            <span className="text-[10px] font-bold text-emerald-400 w-24 shrink-0 truncate">[{log.source}]</span>
                            <span className="text-[11px] text-zinc-300 group-hover:text-white transition-colors">{log.message}</span>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                            <Terminal size={48} className="opacity-20" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">No Telemetry Detected</span>
                        </div>
                    )}
                </div>

                {/* Log Footer */}
                <div className="p-3 bg-black/80 border-t border-white/5 flex items-center justify-between text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                    <div className="flex items-center gap-4">
                        <span>Showing {filtered.length} / {logs.length} entries</span>
                        <span className="text-zinc-800">|</span>
                        <span>Buffer: 300 entries</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span>{live ? 'Synchronized' : 'Desynced'}</span>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default Logs;
