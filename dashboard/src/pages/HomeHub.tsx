/**
 * HomeHub — Wave 1 connector dashboard
 *
 * Six connectors proxied through the RoboFang bridge at :10871/home/{connector}/...
 *   plex            → Plex MCP  :10740
 *   calibre         → Calibre MCP :10720
 *   home-assistant  → HA MCP :10782
 *   tapo            → Tapo MCP :10716
 *   netatmo         → Netatmo MCP :10823
 *   ring            → Ring MCP :10728
 *
 * Each card is self-contained: handles its own fetch, state, errors.
 * Layout: 2-column grid, cards are fixed-height with scrollable content areas.
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Tv2, BookOpen, Home, Camera, CloudSun, Bell,
    Search,
    RefreshCw, AlertTriangle, WifiOff,
    Zap, Thermometer, Droplets, Wind,
    Eye, Shield,
} from 'lucide-react';

const BRIDGE = 'http://localhost:10871';

// ── Shared helpers ────────────────────────────────────────────────────────────

async function homeGet(connector: string, path = '') {
    const url = path ? `${BRIDGE}/home/${connector}/${path}` : `${BRIDGE}/home/${connector}`;
    const r = await axios.get(url, { timeout: 8000 });
    return r.data;
}

async function launchConnector(connector: string) {
    try {
        await axios.post(`${BRIDGE}/api/connector/launch/${connector}`);
        return true;
    } catch (e) {
        console.error('Launch failed:', e);
        return false;
    }
}

async function homePost(connector: string, path: string, body: object) {
    const r = await axios.post(`${BRIDGE}/home/${connector}/${path}`, body, { timeout: 8000 });
    return r.data;
}

// ── Reusable sub-components ───────────────────────────────────────────────────

interface ConnectorCardProps {
    title: string;
    icon: React.ReactNode;
    color: string;      // tailwind bg color for icon box
    glow: string;       // tailwind shadow color
    online: boolean | null;
    loading: boolean;
    error?: string | null;
    onRefresh: () => void;
    children: React.ReactNode;
}

const ConnectorCard: React.FC<ConnectorCardProps> = ({
    title, icon, color, glow, online, loading, error, onRefresh, children
}) => (
    <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full group hover:border-white/20 transition-all duration-500">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-lg ${glow} transition-transform group-hover:scale-110 duration-500`}>
                    {icon}
                </div>
                <div>
                    <div className="text-sm font-bold text-slate-100">{title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {online === null ? (
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Checking...</span>
                        ) : online ? (
                            <>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Online</span>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <WifiOff size={10} className="text-slate-500" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Offline</span>
                                </div>
                                <button
                                    onClick={() => launchConnector(title.toLowerCase().replace(' ', '-'))}
                                    className="px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[9px] font-bold text-indigo-400 border border-indigo-500/20 transition-all uppercase tracking-tighter"
                                >
                                    Launch
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <button
                onClick={onRefresh}
                disabled={loading}
                title="Refresh connector data"
                className="p-2 rounded-xl hover:bg-white/[0.08] transition-all text-slate-400 hover:text-slate-100 active:scale-90 disabled:opacity-40"
            >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>

        {/* Card body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {error ? (
                <div className="flex items-start gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{error}</span>
                </div>
            ) : children}
        </div>
    </div>
);

// Small stat pill
const Stat: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="bg-[#0d0d16] border border-white/[0.07] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
        {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
        <div>
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
            <div className="text-sm font-bold text-slate-100 leading-tight">{value}</div>
        </div>
    </div>
);


// Loading skeleton rows
const Skeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
    <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-8 bg-white/[0.04] rounded-xl animate-pulse" />
        ))}
    </div>
);

// ── PLEX CARD ─────────────────────────────────────────────────────────────────

interface PlexSession {
    title?: string;
    grandparentTitle?: string;
    type?: string;
    Player?: { state?: string; title?: string };
    viewOffset?: number;
    duration?: number;
}

const PlexCard: React.FC = () => {
    const [sessions, setSessions] = useState<PlexSession[]>([]);
    const [libraries, setLibraries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [online, setOnline] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [sess, libs] = await Promise.all([
                homeGet('plex', 'sessions'),
                homeGet('plex', 'libraries'),
            ]);
            setSessions(sess?.sessions ?? sess?.MediaContainer?.Metadata ?? []);
            setLibraries(libs?.libraries ?? libs?.MediaContainer?.Directory ?? []);
            setOnline(true);
        } catch (e: any) {
            setOnline(false);
            setError(e?.response?.data?.error ?? 'Plex MCP unreachable (:10740)');
        }
        setLoading(false);
    }, []);

    const search = async () => {
        if (!query.trim()) return;
        setSearching(true);
        setResults([]);
        try {
            const r = await homeGet('plex', `search?query=${encodeURIComponent(query)}`);
            setResults(r?.results ?? r?.MediaContainer?.Metadata ?? []);
        } catch { setResults([]); }
        setSearching(false);
    };

    useEffect(() => { load(); }, [load]);

    const pct = (s: PlexSession) =>
        s.duration ? Math.round((s.viewOffset ?? 0) / s.duration * 100) : 0;

    return (
        <ConnectorCard
            title="Plex" icon={<Tv2 size={18} className="text-white" />}
            color="bg-yellow-500/20 border border-yellow-500/30" glow="shadow-yellow-500/20"
            online={online} loading={loading} error={error} onRefresh={load}
        >
            {loading ? <Skeleton /> : (
                <div className="space-y-4">
                    {/* Active sessions */}
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                            Active Sessions ({sessions.length})
                        </div>
                        {sessions.length === 0 ? (
                            <div className="text-xs text-slate-500 italic">Nothing playing</div>
                        ) : sessions.map((s, i) => (
                            <div key={i} className="bg-[#0d0d16] border border-white/[0.07] rounded-xl p-3 mb-2">
                                <div className="text-sm font-semibold text-slate-100 leading-tight">
                                    {s.grandparentTitle ? `${s.grandparentTitle} — ` : ''}{s.title}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] text-slate-500">{s.Player?.title}</span>
                                    <span className="text-[10px] font-bold text-yellow-400">{s.Player?.state}</span>
                                </div>
                                <div className="mt-2 h-1 bg-white/10 rounded-full">
                                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${pct(s)}%` } as any} />
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">{pct(s)}%</div>
                            </div>
                        ))}
                    </div>

                    {/* Libraries */}
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                            Libraries ({libraries.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {libraries.map((lib: any, i: number) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.07] text-slate-400">
                                    {lib.title ?? lib.Title}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Search */}
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Search</div>
                        <div className="flex gap-2">
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && search()}
                                placeholder="Title..."
                                className="flex-1 bg-[#0d0d16] border border-white/10 focus:border-yellow-500/50 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none transition-colors"
                            />
                            <button onClick={search} disabled={searching} className="px-3 py-1.5 bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-400 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40">
                                {searching ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                            </button>
                        </div>
                        {results.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {results.slice(0, 5).map((r: any, i: number) => (
                                    <div key={i} className="text-xs text-slate-300 px-2 py-1 bg-white/[0.03] rounded-lg">
                                        {r.title ?? r.Title}
                                        {r.year && <span className="text-slate-500 ml-1">({r.year})</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </ConnectorCard>
    );
};

// ── CALIBRE CARD ──────────────────────────────────────────────────────────────

const CalibreCard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [recent, setRecent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [online, setOnline] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [s, r] = await Promise.all([
                homeGet('calibre', 'stats'),
                homeGet('calibre', 'books/recent?limit=6'),
            ]);
            setStats(s);
            setRecent(r?.books ?? r?.results ?? []);
            setOnline(true);
        } catch (e: any) {
            setOnline(false);
            setError(e?.response?.data?.error ?? 'Calibre MCP unreachable (:10720)');
        }
        setLoading(false);
    }, []);

    const search = async () => {
        if (!query.trim()) return;
        setSearching(true);
        setResults([]);
        try {
            const r = await homeGet('calibre', `books/search?q=${encodeURIComponent(query)}&limit=8`);
            setResults(r?.books ?? r?.results ?? []);
        } catch { setResults([]); }
        setSearching(false);
    };

    useEffect(() => { load(); }, [load]);

    return (
        <ConnectorCard
            title="Calibre" icon={<BookOpen size={18} className="text-white" />}
            color="bg-blue-500/20 border border-blue-500/30" glow="shadow-blue-500/20"
            online={online} loading={loading} error={error} onRefresh={load}
        >
            {loading ? <Skeleton /> : (
                <div className="space-y-4">
                    {stats && (
                        <div className="grid grid-cols-2 gap-2">
                            <Stat label="Books" value={stats.total_books?.toLocaleString() ?? '—'} icon={<BookOpen size={13} />} />
                            <Stat label="Formats" value={stats.total_formats ?? '—'} icon={<Zap size={13} />} />
                        </div>
                    )}

                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Recently Added</div>
                        {recent.length === 0
                            ? <div className="text-xs text-slate-500 italic">No recent books</div>
                            : recent.map((b: any, i: number) => (
                                <div key={i} className="flex items-start justify-between py-1.5 border-b border-white/[0.05] last:border-0">
                                    <div>
                                        <div className="text-xs font-semibold text-slate-200 leading-tight">{b.title}</div>
                                        <div className="text-[10px] text-slate-500">{b.authors ?? b.author}</div>
                                    </div>
                                    <div className="flex gap-1 ml-2 shrink-0">
                                        {(b.formats ?? []).slice(0, 3).map((f: string) => (
                                            <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-blue-400 uppercase font-bold">{f}</span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Search Library</div>
                        <div className="flex gap-2">
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && search()}
                                placeholder="Title, author, tag..."
                                className="flex-1 bg-[#0d0d16] border border-white/10 focus:border-blue-500/50 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none transition-colors"
                            />
                            <button onClick={search} disabled={searching} className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40">
                                {searching ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                            </button>
                        </div>
                        {results.length > 0 && (
                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                {results.map((r: any, i: number) => (
                                    <div key={i} className="text-xs text-slate-300 px-2 py-1 bg-white/[0.03] rounded-lg flex items-center justify-between">
                                        <span>{r.title}</span>
                                        <span className="text-[10px] text-slate-500 ml-2">{r.authors ?? r.author}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </ConnectorCard>
    );
};

// ── HOME ASSISTANT CARD ───────────────────────────────────────────────────────

interface HAEntity {
    entity_id: string;
    state: string;
    attributes?: { friendly_name?: string; unit_of_measurement?: string };
}

const HomeAssistantCard: React.FC = () => {
    const [entities, setEntities] = useState<HAEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [online, setOnline] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [toggling, setToggling] = useState<string | null>(null);

    const DOMAINS_SHOW = ['light', 'switch', 'climate', 'cover', 'media_player', 'sensor', 'binary_sensor'];

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await homeGet('home-assistant', 'states');
            const all: HAEntity[] = r?.entities ?? r ?? [];
            // filter to interesting domains, limit to 30
            const filtered = all
                .filter((e: HAEntity) => DOMAINS_SHOW.some(d => e.entity_id.startsWith(d + '.')))
                .slice(0, 30);
            setEntities(filtered);
            setOnline(true);
        } catch (e: any) {
            setOnline(false);
            setError(e?.response?.data?.error ?? 'Home Assistant MCP unreachable (:10782)');
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const toggle = async (entity_id: string) => {
        setToggling(entity_id);
        try {
            await homePost('home-assistant', 'services/homeassistant/toggle', { entity_id });
            await load();
        } catch { /* noop */ }
        setToggling(null);
    };

    const domain = (id: string) => id.split('.')[0];

    const stateColor = (state: string) => {
        if (['on', 'open', 'playing', 'home'].includes(state)) return 'text-emerald-400';
        if (['off', 'closed', 'idle', 'not_home'].includes(state)) return 'text-slate-500';
        return 'text-cyan-400';
    };

    const toggleable = ['light', 'switch', 'input_boolean'];

    const shown = entities.filter(e =>
        !filter || e.entity_id.includes(filter) ||
        (e.attributes?.friendly_name ?? '').toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <ConnectorCard
            title="Home Assistant" icon={<Home size={18} className="text-white" />}
            color="bg-indigo-500/20 border border-indigo-500/30" glow="shadow-indigo-500/20"
            online={online} loading={loading} error={error} onRefresh={load}
        >
            {loading ? <Skeleton rows={6} /> : (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <Stat label="Entities" value={entities.length} />
                        <Stat label="Active" value={entities.filter(e => e.state === 'on' || e.state === 'playing').length} />
                    </div>

                    <input
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Filter entities..."
                        className="w-full bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none transition-colors"
                    />

                    <div className="space-y-1 max-h-56 overflow-y-auto">
                        {shown.map((e) => (
                            <div key={e.entity_id} className="flex items-center justify-between px-2.5 py-2 bg-[#0d0d16] border border-white/[0.06] rounded-xl">
                                <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-200 truncate">
                                        {e.attributes?.friendly_name ?? e.entity_id}
                                    </div>
                                    <div className="text-[10px] text-slate-500">{domain(e.entity_id)}</div>
                                </div>
                                <div className="flex items-center gap-2 ml-2 shrink-0">
                                    <span className={`text-[10px] font-bold uppercase ${stateColor(e.state)}`}>
                                        {e.state}
                                        {e.attributes?.unit_of_measurement ? ` ${e.attributes.unit_of_measurement}` : ''}
                                    </span>
                                    {toggleable.some(d => e.entity_id.startsWith(d + '.')) && (
                                        <button
                                            onClick={() => toggle(e.entity_id)}
                                            disabled={toggling === e.entity_id}
                                            title={`Toggle ${e.attributes?.friendly_name ?? e.entity_id}`}
                                            className="w-7 h-4 rounded-full border border-white/10 bg-white/[0.06] hover:bg-white/10 transition-all active:scale-90 disabled:opacity-40 flex items-center justify-center"
                                        >
                                            <Zap size={9} className={e.state === 'on' ? 'text-emerald-400' : 'text-slate-500'} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {shown.length === 0 && <div className="text-xs text-slate-500 italic text-center py-4">No matching entities</div>}
                    </div>
                </div>
            )}
        </ConnectorCard>
    );
};

// ── TAPO CARD ─────────────────────────────────────────────────────────────────

const TapoCard: React.FC = () => {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [online, setOnline] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await homeGet('tapo', 'devices');
            setDevices(r?.devices ?? r?.data ?? r ?? []);
            setOnline(true);
        } catch (e: any) {
            setOnline(false);
            setError(e?.response?.data?.error ?? 'Tapo MCP unreachable (:10716)');
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const toggle = async (ip: string, on: boolean) => {
        setToggling(ip);
        try {
            await homePost('tapo', 'device/toggle', { ip, state: !on });
            await load();
        } catch { /* noop */ }
        setToggling(null);
    };

    return (
        <ConnectorCard
            title="Tapo Devices" icon={<Camera size={18} className="text-white" />}
            color="bg-green-500/20 border border-green-500/30" glow="shadow-green-500/20"
            online={online} loading={loading} error={error} onRefresh={load}
        >
            {loading ? <Skeleton rows={4} /> : (
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                        <Stat label="Total" value={devices.length} />
                        <Stat label="On" value={devices.filter((d: any) => d.device_on ?? d.is_on).length} />
                        <Stat label="Cameras" value={devices.filter((d: any) => (d.type ?? d.device_type ?? '').toLowerCase().includes('cam')).length} />
                    </div>

                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {devices.length === 0
                            ? <div className="text-xs text-slate-500 italic text-center py-4">No Tapo devices found</div>
                            : devices.map((d: any, i: number) => {
                                const isOn = d.device_on ?? d.is_on ?? false;
                                const ip = d.ip ?? d.host ?? '';
                                const name = d.alias ?? d.nickname ?? d.device_id ?? `Device ${i + 1}`;
                                const type = d.type ?? d.device_type ?? 'device';
                                const isCamera = type.toLowerCase().includes('cam');
                                return (
                                    <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-[#0d0d16] border border-white/[0.06] rounded-xl">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-2 h-2 rounded-full ${isOn ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-slate-600'}`} />
                                            <div>
                                                <div className="text-xs font-semibold text-slate-200">{name}</div>
                                                <div className="text-[10px] text-slate-500">{type} · {ip}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isCamera && (
                                                <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded uppercase">CAM</span>
                                            )}
                                            {!isCamera && (
                                                <button
                                                    onClick={() => toggle(ip, isOn)}
                                                    disabled={toggling === ip || !ip}
                                                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 ${isOn
                                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                                                        : 'bg-white/[0.05] border-white/10 text-slate-400 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {toggling === ip ? '...' : isOn ? 'ON' : 'OFF'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            )}
        </ConnectorCard>
    );
};

// ── NETATMO CARD ──────────────────────────────────────────────────────────────

const NetatmoCard: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [online, setOnline] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await homeGet('netatmo', 'stations');
            setData(r);
            setOnline(true);
        } catch (e: any) {
            setOnline(false);
            setError(e?.response?.data?.error ?? 'Netatmo MCP unreachable (:10823)');
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Flatten modules from any station response shape
    const getModules = (d: any): any[] => {
        if (!d) return [];
        if (Array.isArray(d)) return d;
        if (d.stations) return d.stations.flatMap((s: any) => [s, ...(s.modules ?? [])]);
        if (d.body?.devices) return d.body.devices.flatMap((s: any) => [s, ...(s.modules ?? [])]);
        return [];
    };

    const modules = getModules(data);

    const getMeasure = (m: any, key: string) =>
        m?.dashboard_data?.[key] ?? m?.[key] ?? null;

    return (
        <ConnectorCard
            title="Netatmo Weather" icon={<CloudSun size={18} className="text-white" />}
            color="bg-cyan-500/20 border border-cyan-500/30" glow="shadow-cyan-500/20"
            online={online} loading={loading} error={error} onRefresh={load}
        >
            {loading ? <Skeleton rows={4} /> : modules.length === 0 ? (
                <div className="text-xs text-slate-500 italic text-center py-4">No Netatmo stations found</div>
            ) : (
                <div className="space-y-3">
                    {modules.map((m: any, i: number) => {
                        const name = m.module_name ?? m.station_name ?? m.type ?? `Module ${i + 1}`;
                        const temp = getMeasure(m, 'Temperature');
                        const hum = getMeasure(m, 'Humidity');
                        const co2 = getMeasure(m, 'CO2');
                        const rain = getMeasure(m, 'Rain');
                        const wind = getMeasure(m, 'WindStrength');
                        const pressure = getMeasure(m, 'Pressure');
                        return (
                            <div key={i} className="bg-[#0d0d16] border border-white/[0.07] rounded-xl p-3">
                                <div className="text-xs font-bold text-slate-200 mb-2">{name}</div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {temp !== null && <div className="flex items-center gap-1.5 text-xs text-slate-300"><Thermometer size={11} className="text-orange-400" />{temp.toFixed(1)} °C</div>}
                                    {hum !== null && <div className="flex items-center gap-1.5 text-xs text-slate-300"><Droplets size={11} className="text-blue-400" />{hum}%</div>}
                                    {co2 !== null && <div className="flex items-center gap-1.5 text-xs text-slate-300"><Wind size={11} className="text-green-400" />CO₂ {co2} ppm</div>}
                                    {rain !== null && <div className="flex items-center gap-1.5 text-xs text-slate-300"><Droplets size={11} className="text-cyan-400" />Rain {rain} mm</div>}
                                    {wind !== null && <div className="flex items-center gap-1.5 text-xs text-slate-300"><Wind size={11} className="text-slate-300" />{wind} km/h</div>}
                                    {pressure !== null && <div className="flex items-center gap-1.5 text-xs text-slate-300"><Zap size={11} className="text-purple-400" />{pressure} hPa</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </ConnectorCard>
    );
};

// ── RING CARD ─────────────────────────────────────────────────────────────────

const RingCard: React.FC = () => {
    const [devices, setDevices] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [online, setOnline] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [devR, evtR] = await Promise.all([
                homeGet('ring', 'devices'),
                homeGet('ring', 'events?limit=5'),
            ]);
            setDevices(devR?.devices ?? devR?.data ?? []);
            setEvents(evtR?.events ?? evtR?.data ?? []);
            setOnline(true);
        } catch (e: any) {
            setOnline(false);
            setError(e?.response?.data?.error ?? 'Ring MCP unreachable (:10728)');
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const fmtTime = (ts: string | number) => {
        try {
            return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return '—'; }
    };

    return (
        <ConnectorCard
            title="Ring Security" icon={<Bell size={18} className="text-white" />}
            color="bg-red-500/20 border border-red-500/30" glow="shadow-red-500/20"
            online={online} loading={loading} error={error} onRefresh={load}
        >
            {loading ? <Skeleton rows={4} /> : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Stat label="Devices" value={devices.length} icon={<Shield size={12} />} />
                        <Stat label="Events" value={events.length} icon={<Eye size={12} />} />
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Devices</div>
                        <div className="space-y-1.5">
                            {devices.length === 0
                                ? <div className="text-xs text-slate-500 italic">No Ring devices found</div>
                                : devices.map((d: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#0d0d16] border border-white/[0.06] rounded-xl">
                                        <div>
                                            <div className="text-xs font-semibold text-slate-200">{d.description?.name ?? d.name ?? `Device ${i + 1}`}</div>
                                            <div className="text-[10px] text-slate-500">{d.kind ?? d.type ?? 'unknown'}</div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${d.health?.battery_percentage > 20 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                            {d.health?.battery_percentage !== undefined && (
                                                <span className="text-[10px] text-slate-400">{d.health.battery_percentage}%</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Recent Events</div>
                        <div className="space-y-1">
                            {events.length === 0
                                ? <div className="text-xs text-slate-500 italic">No recent events</div>
                                : events.map((e: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between px-2.5 py-2 bg-[#0d0d16] border border-white/[0.06] rounded-xl">
                                        <div className="flex items-center gap-2">
                                            {e.kind === 'motion' ? <Eye size={11} className="text-amber-400" /> : <Bell size={11} className="text-red-400" />}
                                            <span className="text-xs text-slate-300 capitalize">{e.kind ?? 'event'}</span>
                                            {e.doorbell_id && <span className="text-[10px] text-slate-500">{e.doorbell_id}</span>}
                                        </div>
                                        <span className="text-[10px] text-slate-500">{fmtTime(e.created_at)}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}
        </ConnectorCard>
    );
};

// ── Main HomeHub page ─────────────────────────────────────────────────────────

const HomeHub: React.FC = () => {
    const [bridgeStatus, setBridgeStatus] = useState<any>(null);

    useEffect(() => {
        axios.get(`${BRIDGE}/home`, { timeout: 5000 })
            .then(r => setBridgeStatus(r.data?.connectors ?? null))
            .catch(() => { });
    }, []);

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white font-heading flex items-center gap-3">
                        <Home className="text-indigo-400" />
                        Home Hub
                    </h1>
                    <p className="text-slate-300 text-sm mt-1">
                        Wave 1 connectors — media, smart home, security, and environment.
                    </p>
                </div>
                {/* Mini status strip */}
                {bridgeStatus && (
                    <div className="hidden lg:flex items-center gap-2 flex-wrap justify-end max-w-xs">
                        {Object.entries(bridgeStatus).map(([name, s]: [string, any]) => (
                            <div key={name} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest ${s.online
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-white/[0.04] border-white/10 text-slate-500'
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${s.online ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                {name}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2×3 grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10" style={{ gridAutoRows: '420px' } as any}>
                <PlexCard />
                <CalibreCard />
                <HomeAssistantCard />
                <TapoCard />
                <NetatmoCard />
                <RingCard />
            </div>
        </div>
    );
};

export default HomeHub;
