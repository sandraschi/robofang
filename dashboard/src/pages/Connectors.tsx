import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PlugZap, CheckCircle2, AlertCircle, RefreshCw, Terminal, Search, Loader2 } from 'lucide-react';

const BRIDGE = 'http://localhost:10871';

interface ConnectorRow {
    id: string;
    name: string;
    type: string;
    status: 'online' | 'offline' | 'degraded';
    url: string;
    source: 'live' | 'config' | 'home' | 'federation';
    domain: string;
}

interface FleetSummary {
    connectors_online: number;
    connectors_total: number;
    agents_discovered: number;
}

const Connectors: React.FC = () => {
    const [rows, setRows] = useState<ConnectorRow[]>([]);
    const [summary, setSummary] = useState<FleetSummary | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch both in parallel
            const [homeRes, fleetRes] = await Promise.allSettled([
                fetch(`${BRIDGE}/home`),
                fetch(`${BRIDGE}/fleet`),
            ]);

            const merged: Record<string, ConnectorRow> = {};

            // /home — real per-connector reachability
            if (homeRes.status === 'fulfilled' && homeRes.value.ok) {
                const data = await homeRes.value.json();
                const connectors: Record<string, { online: boolean; url: string; error?: string }> =
                    data.connectors ?? {};
                for (const [id, info] of Object.entries(connectors)) {
                    merged[id] = {
                        id,
                        name: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                        type: 'connector',
                        status: info.online ? 'online' : 'offline',
                        url: info.url,
                        source: 'home',
                        domain: 'connectors',
                    };
                }
            }

            // /fleet — richer metadata, fills in what /home doesn't know
            if (fleetRes.status === 'fulfilled' && fleetRes.value.ok) {
                const data = await fleetRes.value.json();
                setSummary(data.summary ?? null);

                for (const c of (data.connectors ?? []) as Array<{
                    id: string; name: string; type: string;
                    status: string; domain: string;
                }>) {
                    if (!merged[c.id]) {
                        merged[c.id] = {
                            id: c.id,
                            name: c.name,
                            type: c.type,
                            status: c.status === 'online' ? 'online' : 'offline',
                            url: '',
                            source: 'federation',
                            domain: c.domain,
                        };
                    } else {
                        // Enrich with fleet metadata
                        merged[c.id].name = c.name;
                        merged[c.id].type = c.type;
                        merged[c.id].domain = c.domain;
                    }
                }
            }

            setRows(Object.values(merged).sort((a, b) => {
                // Online first, then alphabetical
                if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
                return a.id.localeCompare(b.id);
            }));
            setLastRefresh(new Date());
        } catch (e) {
            setError('Failed to reach bridge at :10871');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load on mount + every 30s
    useEffect(() => {
        loadData();
        const id = setInterval(loadData, 30_000);
        return () => clearInterval(id);
    }, [loadData]);

    const filtered = rows.filter(r =>
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.domain.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const onlineCount = rows.filter(r => r.status === 'online').length;
    const health = rows.length ? Math.round((onlineCount / rows.length) * 1000) / 10 : 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-white font-heading">Connector Registry</h1>
                    <p className="text-slate-400 text-sm">
                        Live reachability via <span className="font-mono text-indigo-400">/home</span> ·
                        Fleet metadata via <span className="font-mono text-indigo-400">/fleet</span>
                        {lastRefresh && (
                            <span className="ml-3 text-slate-500">
                                · refreshed {lastRefresh.toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search connectors..."
                            className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-colors w-64"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-white text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        {loading
                            ? <Loader2 size={16} className="animate-spin" />
                            : <RefreshCw size={16} />}
                        {loading ? 'Probing...' : 'Refresh All'}
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="glass-panel bg-white/5 border-white/10 rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/2">
                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Connector</th>
                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Type / Domain</th>
                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Endpoint</th>
                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Source</th>
                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading && rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-12 text-center text-slate-500 text-sm">
                                    <Loader2 className="inline mr-2 animate-spin" size={16} />
                                    Probing all connectors...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-12 text-center text-slate-500 text-sm">
                                    No connectors found{searchQuery && ` matching "${searchQuery}"`}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((row, idx) => (
                                <motion.tr
                                    key={row.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                    className="group hover:bg-white/2 transition-colors"
                                >
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                                <PlugZap size={16} />
                                            </div>
                                            <span className="text-sm font-bold text-white font-mono">{row.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-300">{row.type}</span>
                                            <span className="text-[10px] text-slate-500">{row.domain}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-2">
                                            {row.status === 'online' ? (
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                            ) : (
                                                <AlertCircle size={14} className="text-rose-500" />
                                            )}
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${row.status === 'online' ? 'text-emerald-500' : 'text-rose-500'
                                                }`}>
                                                {row.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            {row.url || '—'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{row.source}</span>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button title="Logs" className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                                                <Terminal size={16} />
                                            </button>
                                            <button title="Re-probe" onClick={loadData} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-indigo-400 transition-colors">
                                                <RefreshCw size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 bg-emerald-500/5 border-emerald-500/20 rounded-2xl flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">Federation Health</h3>
                    <div className="flex items-end gap-3 mt-2">
                        <span className="text-4xl font-bold text-white font-mono">{health}%</span>
                        <span className="text-xs text-emerald-500 mb-1 font-medium">
                            {onlineCount}/{rows.length} reachable
                        </span>
                    </div>
                </div>
                <div className="glass-panel p-6 bg-indigo-500/5 border-indigo-500/20 rounded-2xl flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-widest">Fleet Connectors</h3>
                    <div className="flex items-end gap-3 mt-2">
                        <span className="text-4xl font-bold text-white font-mono">
                            {summary?.connectors_total ?? rows.length}
                        </span>
                        <span className="text-xs text-indigo-500 mb-1 font-medium">registered</span>
                    </div>
                </div>
                <div className="glass-panel p-6 bg-purple-500/5 border-purple-500/20 rounded-2xl flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest">Domain Agents</h3>
                    <div className="flex items-end gap-3 mt-2">
                        <span className="text-4xl font-bold text-white font-mono">
                            {summary?.agents_discovered ?? '—'}
                        </span>
                        <span className="text-xs text-purple-400 mb-1 font-medium">discovered</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Connectors;
