import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    Clock,
    Zap,
    Shield,
    Loader2,
    AlertCircle,
    RefreshCw,
    Radio,
} from "lucide-react";

const BRIDGE = 'http://localhost:10871';

interface FeedPost {
    id: string | number;
    content?: string;
    body?: string;
    author?: string;
    created_at?: string;
    timestamp?: string;
    tags?: string[];
}

interface HomeConnector {
    online: boolean;
    url: string;
    error?: string;
}

interface PulseEvent {
    id: string;
    type: string;
    content: string;
    time: string;
    severity: 'low' | 'medium' | 'high';
    source: 'feed' | 'connector';
}

function relativeTime(ts: string | undefined): string {
    if (!ts) return 'unknown';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const Pulse: React.FC = () => {
    const [events, setEvents] = useState<PulseEvent[]>([]);
    const [stats, setStats] = useState({
        uptime: '—',
        totalEvents: 0,
        activeNodes: 0,
        threatLevel: 'Nominal',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [feedRes, homeRes] = await Promise.allSettled([
                fetch(`${BRIDGE}/moltbook/feed`),
                fetch(`${BRIDGE}/home`),
            ]);

            const combined: PulseEvent[] = [];

            // /moltbook/feed — social / journal events
            if (feedRes.status === 'fulfilled' && feedRes.value.ok) {
                const data = await feedRes.value.json();
                const posts: FeedPost[] = Array.isArray(data)
                    ? data
                    : Array.isArray(data.posts) ? data.posts
                        : Array.isArray(data.feed) ? data.feed
                            : [];

                posts.slice(0, 10).forEach((p, i) => {
                    const text = p.content ?? p.body ?? '(no content)';
                    combined.push({
                        id: `feed-${p.id ?? i}`,
                        type: 'Feed',
                        content: text.length > 120 ? text.slice(0, 117) + '…' : text,
                        time: relativeTime(p.created_at ?? p.timestamp),
                        severity: 'low',
                        source: 'feed',
                    });
                });
            }

            // /home — connector reachability as events
            if (homeRes.status === 'fulfilled' && homeRes.value.ok) {
                const data = await homeRes.value.json();
                const connectors: Record<string, HomeConnector> = data.connectors ?? {};

                let online = 0, total = 0;
                const offline: string[] = [];

                for (const [name, info] of Object.entries(connectors)) {
                    total++;
                    if (info.online) {
                        online++;
                    } else {
                        offline.push(name);
                    }
                }

                // One event per offline connector (max 5)
                offline.slice(0, 5).forEach((name) => {
                    combined.push({
                        id: `conn-offline-${name}`,
                        type: 'Connector',
                        content: `${name} is unreachable (${connectors[name].url})`,
                        time: 'now',
                        severity: 'medium',
                        source: 'connector',
                    });
                });

                // One summary event for online connectors
                if (online > 0) {
                    combined.push({
                        id: 'conn-online-summary',
                        type: 'Connector',
                        content: `${online}/${total} connectors reachable`,
                        time: 'now',
                        severity: 'low',
                        source: 'connector',
                    });
                }

                setStats(prev => ({
                    ...prev,
                    activeNodes: online,
                    totalEvents: combined.length,
                    threatLevel: offline.length > total / 2 ? 'Elevated' : 'Nominal',
                }));
            }

            // Sort: connector events first (current), then feed (historical)
            combined.sort((a, b) => {
                if (a.source !== b.source) return a.source === 'connector' ? -1 : 1;
                return 0;
            });

            setEvents(combined);
            setLastRefresh(new Date());
        } catch {
            setError('Bridge unreachable at :10871');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load on mount + every 20s (feed can be somewhat live)
    useEffect(() => {
        loadData();
        const id = setInterval(loadData, 20_000);
        return () => clearInterval(id);
    }, [loadData]);

    const severityDot = (s: string) => {
        if (s === 'high') return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
        if (s === 'medium') return 'bg-amber-500';
        return 'bg-indigo-500';
    };
    const severityText = (s: string) => {
        if (s === 'high') return 'text-rose-500';
        if (s === 'medium') return 'text-amber-500';
        return 'text-indigo-400';
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white font-heading">Global Pulse</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Live feed from <span className="font-mono text-indigo-400">/moltbook/feed</span> ·
                            connector health from <span className="font-mono text-indigo-400">/home</span>
                            {lastRefresh && (
                                <span className="ml-3 text-slate-500">· {lastRefresh.toLocaleTimeString()}</span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Refresh
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Uptime', value: stats.uptime, icon: <Clock size={16} /> },
                    { label: 'Pulse Events', value: events.length.toString(), icon: <Activity size={16} /> },
                    { label: 'Active Nodes', value: stats.activeNodes.toString(), icon: <Zap size={16} /> },
                    { label: 'Threat Level', value: stats.threatLevel, icon: <Shield size={16} /> },
                ].map((stat, i) => (
                    <div key={i} className="glass-panel p-6 bg-white/5 border-white/10 rounded-2xl flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {stat.icon}
                            <span>{stat.label}</span>
                        </div>
                        <span className="text-2xl font-bold text-white font-mono">{stat.value}</span>
                    </div>
                ))}
            </div>

            {/* Event feed */}
            <div className="glass-panel bg-white/5 border-white/10 rounded-3xl overflow-hidden p-2">
                {loading && events.length === 0 ? (
                    <div className="py-16 flex items-center justify-center gap-2 text-slate-500 text-sm">
                        <Loader2 className="animate-spin" size={16} />
                        Fetching live data...
                    </div>
                ) : events.length === 0 ? (
                    <div className="py-16 flex items-center justify-center gap-2 text-slate-500 text-sm">
                        <Radio size={16} />
                        No events — bridge offline or feed empty
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-white/5">
                        {events.map((pulse, idx) => (
                            <motion.div
                                key={pulse.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.04 }}
                                className="p-6 flex items-center justify-between group hover:bg-white/2 transition-colors rounded-2xl"
                            >
                                <div className="flex items-center gap-6">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${severityDot(pulse.severity)}`} />
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${severityText(pulse.severity)}`}>
                                                {pulse.type}
                                            </span>
                                            <span className="text-sm font-medium text-white">{pulse.content}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            Source: {pulse.source} · ID: {String(pulse.id).slice(0, 16)}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-slate-400 flex-shrink-0">{pulse.time}</span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Pulse;
