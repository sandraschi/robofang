import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cpu, Radio, Bot, Settings2, RefreshCw, Search,
    AlertTriangle, Layers, Palette, BookOpen, MessageSquare, Monitor, Wifi, Gamepad2,
    ExternalLink, Play
} from 'lucide-react';
import { fleetApi } from '../api/fleet';
import type { FleetData, FleetConnector, FleetAgent } from '../api/fleet';
import FleetSpace from '../components/FleetSpace';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    const colorClasses: Record<string, string> = {
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    };
    return (
        <Card className={`flex items-center gap-6 p-6 border ${colorClasses[color] || colorClasses.indigo} bg-slate-950/40`}>
            <div className="opacity-80">{icon}</div>
            <div>
                <div className="text-3xl font-bold text-white mb-1 tracking-tighter">{value}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}</div>
            </div>
        </Card>
    );
};

const StatusBadge: React.FC<{ status: FleetConnector['status'] }> = ({ status }) => {
    if (status === 'online') return (
        <Badge variant="glass" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 px-2 py-0.5 h-auto text-[9px] uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.6)] mr-1.5" />
            Online
        </Badge>
    );
    if (status === 'discovered') return (
        <Badge variant="glass" className="bg-indigo-500/15 text-indigo-400 border-indigo-500/25 px-2 py-0.5 h-auto text-[9px] uppercase tracking-widest">
            <Bot size={9} className="mr-1.5" />
            Discovered
        </Badge>
    );
    return (
        <Badge variant="glass" className="bg-slate-500/15 text-slate-400 border-slate-500/20 px-2 py-0.5 h-auto text-[9px] uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mr-1.5" />
            Offline
        </Badge>
    );
};

const ConnectorCard: React.FC<{ item: FleetConnector | FleetAgent }> = ({ item }) => {
    const isAgent = 'capabilities' in item;
    const connector = isAgent ? null : (item as FleetConnector);
    const [serverStatus, setServerStatus] = useState<string | null | undefined>(undefined);
    const [launching, setLaunching] = useState(false);
    const color = domainColor(item.domain);

    useEffect(() => {
        if (!connector?.id || connector.status !== 'online') return;
        let cancelled = false;
        fleetApi.getConnectorStatus(connector.id).then((r) => {
            if (!cancelled) setServerStatus(r.success ? r.server_status ?? null : null);
        });
        return () => { cancelled = true; };
    }, [connector?.id, connector?.status]);

    const handleStartWebapp = useCallback(async () => {
        if (!connector?.repo_path) return;
        setLaunching(true);
        try {
            const r = await fleetApi.launchWebapp(connector.repo_path);
            if (r.success && connector.frontend_url) window.open(connector.frontend_url, '_blank');
        } finally {
            setLaunching(false);
        }
    }, [connector?.repo_path, connector?.frontend_url]);

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
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4 }}
            className="h-full"
        >
            <Card className="group bg-slate-950/40 border-slate-800 hover:border-slate-700 transition-all duration-300 h-full p-4 flex flex-col gap-3 cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${colorMap[color] ?? colorMap.slate}`}>
                        {isAgent ? <Bot size={18} /> : <Cpu size={18} />}
                    </div>
                    <StatusBadge status={item.status} />
                </div>

                <div>
                    <div className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors leading-tight truncate">
                        {item.name}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1 tracking-tighter">
                        {item.type}
                    </div>
                </div>

                {connector && connector.status === 'online' && serverStatus !== undefined && (
                    <div className="text-[10px] text-slate-400 font-medium leading-snug line-clamp-3">
                        {serverStatus ?? 'No status tool'}
                    </div>
                )}

                {connector && (connector.repo_path || connector.frontend_url) && (
                    <div className="flex gap-2 mt-auto pt-2">
                        {connector.frontend_url && (
                            <Button
                                variant="glass"
                                size="sm"
                                className="h-8 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white border-white/10"
                                onClick={() => window.open(connector.frontend_url!, '_blank')}
                            >
                                <ExternalLink size={12} className="mr-1.5" />
                                Open webapp
                            </Button>
                        )}
                        {connector.repo_path && (
                            <Button
                                variant="glass"
                                size="sm"
                                className="h-8 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white border-white/10"
                                onClick={handleStartWebapp}
                                disabled={launching}
                            >
                                <Play size={12} className="mr-1.5" />
                                {launching ? 'Starting…' : 'Start webapp'}
                            </Button>
                        )}
                    </div>
                )}

                {isAgent && (item as FleetAgent).capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto pt-2">
                        {(item as FleetAgent).capabilities.slice(0, 3).map((cap) => (
                            <Badge key={cap} variant="outline" className="text-[8px] font-bold px-1.5 py-0 h-4 border-white/[0.06] text-slate-500 bg-white/[0.02]">
                                {cap}
                            </Badge>
                        ))}
                        {(item as FleetAgent).capabilities.length > 3 && (
                            <span className="text-[9px] font-semibold text-slate-600 pl-1">
                                +{(item as FleetAgent).capabilities.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </Card>
        </motion.div>
    );
};

const DomainSection: React.FC<{ domain: string; items: (FleetConnector | FleetAgent)[] }> = ({ domain, items }) => {
    const meta = DOMAIN_META[domain] ?? { label: domain, icon: <Layers size={15} />, color: 'slate' };
    const online = items.filter(i => i.status === 'online').length;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
                    <span className="text-slate-400">{meta.icon}</span>
                    <span className="tracking-tight">{meta.label}</span>
                </div>
                <div className="flex-1 h-px bg-white/[0.06]" />
                <Badge variant="glass" className="bg-slate-900/40 border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest h-5">
                    {online > 0 && <span className="text-emerald-500 mr-1">{online} OK ·</span>} {items.length} total
                </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                    {items.map((item) => (
                        <ConnectorCard key={item.id} item={item} />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

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
            const result = await fleetApi.get();
            if (result.success) {
                setData(result);
            } else {
                setError('Fleet endpoint returned failure.');
            }
        } catch (e: any) {
            setError(e?.message ?? 'Backend unreachable');
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
        <div className="space-y-10 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <Badge variant="glass" className="bg-purple-500/10 border-purple-500/20 text-[9px] font-bold text-purple-400 uppercase tracking-widest px-3 py-1">
                        Swarm Topology
                    </Badge>
                </div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-5xl font-bold tracking-tighter text-white mb-3">
                            Fleet <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">Discovery</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl font-medium leading-relaxed">
                            Monitor and manage {allItems.length}+ MCP nodes across the decentralized federation. Substrate sync status nominal.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="glass"
                            size="icon"
                            onClick={fetch}
                            disabled={loading}
                            className="h-12 w-12 rounded-2xl bg-white/[0.03] border-white/10 text-slate-300 hover:text-white"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </Button>
                        <Button variant="glass" size="icon" className="h-12 w-12 rounded-2xl bg-white/[0.03] border-white/10 text-slate-300 hover:text-white">
                            <Settings2 size={20} />
                        </Button>
                    </div>
                </div>
            </header>

            {data && <FleetSpace nodes={allItems} />}

            {data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <MetricCard icon={<Cpu size={24} />} label="Online Connectors" value={data.summary.connectors_online.toString()} color="emerald" />
                    <MetricCard icon={<Radio size={24} />} label="Total Swarm Size" value={data.summary.connectors_total.toString()} color="indigo" />
                    <MetricCard icon={<Bot size={24} />} label="Agents Discovered" value={data.summary.agents_discovered.toString()} color="purple" />
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-950/40 border border-slate-800 p-4 rounded-3xl backdrop-blur-sm">
                <div className="relative w-full md:w-96 group">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search swarm nodes..."
                        className="bg-slate-900/50 border-slate-800 rounded-2xl pl-12 h-12 text-sm focus-visible:ring-purple-500/30 transition-all font-medium"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar max-w-full">
                    {tabs.map(tab => (
                        <Button
                            key={tab}
                            variant={activeTab === tab ? "default" : "glass"}
                            size="sm"
                            onClick={() => setActiveTab(tab)}
                            className={`rounded-xl text-[10px] font-bold uppercase tracking-widest px-4 h-9 ${activeTab === tab 
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
                                : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                            {tab}
                        </Button>
                    ))}
                </div>
            </div>

            {loading && !data && (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 rounded-full border-4 border-purple-500/10" />
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
                    </div>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] animate-pulse">Syncing Swarm Topology</p>
                </div>
            )}

            {error && (
                <Card className="border-red-500/20 bg-red-500/5 flex items-center gap-4 text-red-400 p-8 rounded-3xl">
                    <AlertTriangle size={32} className="shrink-0" />
                    <div>
                        <h3 className="text-xl font-bold tracking-tight">Federation Sync Failure</h3>
                        <p className="text-sm opacity-80 mt-1 font-medium">{error}</p>
                    </div>
                </Card>
            )}

            {!loading && filtered.length > 0 && (
                <div className="grid gap-16">
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
