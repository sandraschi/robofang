import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cpu, Radio, Bot, Settings2, RefreshCw, Search,
    AlertTriangle, Layers, Palette, BookOpen, MessageSquare, Monitor, Wifi, Gamepad2
} from 'lucide-react';
import { getFleet } from '../api';
import FleetSpace from '../components/FleetSpace';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FleetConnector {
    id: string;
    name: string;
    type: string;
    status: 'online' | 'offline' | 'discovered';
    source: 'live' | 'config' | 'federation';
    domain: string;
    enabled?: boolean;
}

interface FleetAgent {
    id: string;
    name: string;
    type: string;
    status: 'discovered';
    source: 'federation';
    domain: string;
    path: string;
    capabilities: string[];
}

interface FleetSummary {
    connectors_online: number;
    connectors_total: number;
    agents_discovered: number;
}

interface FleetData {
    summary: FleetSummary;
    connectors: FleetConnector[];
    agents: FleetAgent[];
    domains: string[];
}

// ── Domain display config ─────────────────────────────────────────────────────

const DOMAIN_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    connectors: { label: 'Live Connectors', icon: <Radio size={15} />, color: 'indigo' },
    creative: { label: 'Creative', icon: <Palette size={15} />, color: 'purple' },
    knowledge: { label: 'Knowledge', icon: <BookOpen size={15} />, color: 'blue' },
    comms: { label: 'Comms', icon: <MessageSquare size={15} />, color: 'cyan' },
    system: { label: 'System', icon: <Monitor size={15} />, color: 'slate' },
    hardware_iot: { label: 'Hardware / IoT', icon: <Wifi size={15} />, color: 'emerald' },
    robotics_vr: { label: 'Robotics & VR', icon: <Gamepad2 size={15} />, color: 'pink' },
};

const DOMAIN_ORDER = ['connectors', 'creative', 'knowledge', 'comms', 'system', 'hardware_iot', 'robotics_vr'];

function domainColor(domain: string) {
    return DOMAIN_META[domain]?.color ?? 'slate';
}

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => {
    const colors: Record<string, string> = {
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    };
    return (
        <div className={`page-card flex items-center gap-6 p-6 border ${colors[color] || colors.indigo}`}>
            <div className="opacity-80">{icon}</div>
            <div>
                <div className="text-3xl font-heading font-bold text-white mb-1">{value}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}</div>
            </div>
        </div>
    );
};

// ── Status badge ──────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: FleetConnector['status'] }> = ({ status }) => {
    if (status === 'online') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            Online
        </span>
    );
    if (status === 'discovered') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
            <Bot size={9} />
            Discovered
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-slate-500/15 text-slate-400 border border-slate-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            Offline
        </span>
    );
};

// ── Connector card ────────────────────────────────────────────────────────────

const ConnectorCard: React.FC<{ item: FleetConnector | FleetAgent }> = ({ item }) => {
    const isAgent = 'capabilities' in item;
    const color = domainColor(item.domain);

    const colorMap: Record<string, string> = {
        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 group-hover:border-indigo-500/40',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 group-hover:border-purple-500/40',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:border-blue-500/40',
        cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 group-hover:border-cyan-500/40',
        slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20 group-hover:border-slate-500/40',
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:border-emerald-500/40',
        pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20 group-hover:border-pink-500/40',
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -2 }}
            className="group bg-[#16162a] border border-white/10 hover:border-white/20 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer transition-colors"
        >
            <div className="flex items-start justify-between gap-2">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${colorMap[color] ?? colorMap.slate}`}>
                    {isAgent ? <Bot size={18} /> : <Cpu size={18} />}
                </div>
                <StatusBadge status={item.status} />
            </div>

            <div>
                <div className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors leading-tight">
                    {item.name}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                    {item.type}
                </div>
            </div>

            {isAgent && (item as FleetAgent).capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-auto">
                    {(item as FleetAgent).capabilities.slice(0, 3).map((cap) => (
                        <span key={cap} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400 border border-white/[0.06]">
                            {cap}
                        </span>
                    ))}
                    {(item as FleetAgent).capabilities.length > 3 && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-500 border border-white/[0.06]">
                            +{(item as FleetAgent).capabilities.length - 3}
                        </span>
                    )}
                </div>
            )}
        </motion.div>
    );
};

// ── Domain section ────────────────────────────────────────────────────────────

const DomainSection: React.FC<{ domain: string; items: (FleetConnector | FleetAgent)[] }> = ({ domain, items }) => {
    const meta = DOMAIN_META[domain] ?? { label: domain, icon: <Layers size={15} />, color: 'slate' };
    const online = items.filter(i => i.status === 'online').length;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
                    <span className="text-slate-400">{meta.icon}</span>
                    {meta.label}
                </div>
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {online > 0 ? `${online} online · ` : ''}{items.length} total
                </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <AnimatePresence>
                    {items.map((item) => (
                        <ConnectorCard key={item.id} item={item} />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────

const Fleet: React.FC = () => {
    const [data, setData] = useState<FleetData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<string>('all');

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getFleet();
            if (result.success) {
                setData(result);
            } else {
                setError('Fleet endpoint returned failure.');
            }
        } catch (e: any) {
            setError(e?.message ?? 'Backend unreachable — is the bridge running on :10871?');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const allItems: (FleetConnector | FleetAgent)[] = data
        ? [...data.connectors, ...data.agents]
        : [];

    const filtered = allItems.filter((item) => {
        const matchesSearch = search === '' ||
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.type.toLowerCase().includes(search.toLowerCase()) ||
            item.domain.toLowerCase().includes(search.toLowerCase()) ||
            ('capabilities' in item && item.capabilities.some(c => c.toLowerCase().includes(search.toLowerCase())));
        const matchesTab = activeTab === 'all' || item.domain === activeTab;
        return matchesSearch && matchesTab;
    });

    const grouped: Record<string, (FleetConnector | FleetAgent)[]> = {};
    DOMAIN_ORDER.forEach(d => { grouped[d] = []; });
    filtered.forEach(item => {
        if (!grouped[item.domain]) grouped[item.domain] = [];
        grouped[item.domain].push(item);
    });
    const activeDomains = DOMAIN_ORDER.filter(d => grouped[d]?.length > 0);

    const tabs = ['all', ...DOMAIN_ORDER.filter(d =>
        allItems.some(i => i.domain === d)
    )];

    return (
        <div className="space-y-10 max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                        Swarm Topology
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-5xl font-heading font-bold tracking-tight text-white mb-2">
                            Fleet <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">Discovery</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl font-medium">
                            Monitor and manage {allItems.length}+ MCP nodes across the decentralized federation.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetch}
                            disabled={loading}
                            title="Refresh Fleet"
                            className="p-3 bg-white/[0.05] border border-white/10 rounded-2xl text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button className="p-3 bg-white/[0.05] border border-white/10 rounded-2xl text-slate-300 hover:text-white hover:bg-white/10 transition-all" title="Fleet Settings">
                            <Settings2 size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* 3D Space */}
            {data && <FleetSpace nodes={allItems} />}

            {/* Metrics Overview */}
            {data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <MetricCard icon={<Cpu size={20} />} label="Online Connectors" value={data.summary.connectors_online.toString()} color="emerald" />
                    <MetricCard icon={<Radio size={20} />} label="Total Swarm Size" value={data.summary.connectors_total.toString()} color="indigo" />
                    <MetricCard icon={<Bot size={20} />} label="Agents Discovered" value={data.summary.agents_discovered.toString()} color="purple" />
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
                <div className="relative w-full md:w-96 group">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search swarm nodes..."
                        className="w-full bg-[#0a0a16] border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-0 focus:border-purple-500/50 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                                : 'bg-white/[0.05] text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            {loading && !data && (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <div className="w-16 h-16 rounded-3xl border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                    <p className="text-slate-400 font-mono text-xs uppercase tracking-[0.3em] animate-pulse">Syncing Swarm Topology...</p>
                </div>
            )}

            {error && (
                <div className="page-card border-red-500/20 bg-red-500/5 flex items-center gap-4 text-red-400 p-8">
                    <AlertTriangle size={24} />
                    <div>
                        <h3 className="text-lg font-bold">Federation Sync Failure</h3>
                        <p className="text-sm opacity-80">{error}</p>
                    </div>
                </div>
            )}

            {!loading && filtered.length === 0 && (
                <div className="text-center py-32">
                    <p className="text-slate-500 font-medium">No nodes found matching your operational parameters.</p>
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <div className="space-y-12">
                    {activeTab === 'all'
                        ? activeDomains.map(domain => (
                            <DomainSection key={domain} domain={domain} items={grouped[domain]} />
                        ))
                        : (
                            <DomainSection domain={activeTab} items={filtered} />
                        )
                    }
                </div>
            )}
        </div>
    );
};

export default Fleet;
