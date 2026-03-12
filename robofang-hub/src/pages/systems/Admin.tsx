import React, { useState, useEffect, useCallback } from 'react';
import {
    PlugZap, RefreshCw, Terminal, Search,
    Wrench, ExternalLink, ShieldAlert
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';

const BRIDGE_BASE_URL = 'http://localhost:10871';

interface Connector {
    id: string;
    name: string;
    status: 'online' | 'offline';
    type: string;
    endpoint: string;
}

const Admin: React.FC = () => {
    const [connectors, setConnectors] = useState<Connector[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchConnectors = useCallback(async () => {
        setLoading(true);
        try {
            const resp = await fetch(`${BRIDGE_BASE_URL}/home`);
            const data = await resp.json();
            // Mapping logic
            const list: Connector[] = (Object.entries(data.connectors || {}) as [string, { online: boolean; url: string }][]).map(([id, info]) => ({
                id,
                name: id.toUpperCase().replace(/-/g, '_'),
                status: info.online ? 'online' : 'offline',
                type: 'FastMCP',
                endpoint: info.url
            }));
            setConnectors(list);
        } catch (err) {
            console.warn('Bridge unreachable, using mockup');
            setConnectors([
                { id: 'ollama', name: 'NEURAL_FABRIC', status: 'online', type: 'LLM_HOST', endpoint: 'localhost:11434' },
                { id: 'vrc-osc', name: 'OSC_BRIDGE', status: 'offline', type: 'UDP_SYNC', endpoint: 'localhost:9000' },
                { id: 'plex-api', name: 'MEDIA_INDEXER', status: 'online', type: 'REST', endpoint: 'localhost:32400' },
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConnectors();
    }, [fetchConnectors]);

    const filtered = connectors.filter(c => 
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                            <ShieldAlert size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Connector Admin</h1>
                    </div>
                    <p className="text-zinc-400 text-sm max-w-xl font-medium">
                        Manage substrate connectors and bridge handshakes.
                    </p>
                </div>
                
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input
                            type="text"
                            placeholder="FILTER_NODES..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black text-white uppercase tracking-widest focus:border-orange-500/50 outline-none w-48 md:w-64 transition-all"
                        />
                    </div>
                    <button 
                        onClick={fetchConnectors}
                        className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.1] transition-all"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Node ID</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Protocol</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Handshake</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Endpoint</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                            <AnimatePresence mode="popLayout">
                                {filtered.map((row, idx) => (
                                    <motion.tr
                                        key={row.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="group hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                                                    <PlugZap size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-white uppercase tracking-tight">{row.name}</div>
                                                    <div className="text-[9px] text-zinc-600 font-mono tracking-tighter">{row.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{row.type}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${row.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${row.status === 'online' ? 'text-emerald-400' : 'text-rose-400'}`}>{row.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] text-zinc-600 font-mono italic">{row.endpoint}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all"><Terminal size={14} /></button>
                                                <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all"><Wrench size={14} /></button>
                                                <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all"><ExternalLink size={14} /></button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
};

export default Admin;
