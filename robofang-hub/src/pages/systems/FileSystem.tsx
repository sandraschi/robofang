import React, { useState } from 'react';
import {
    Folder, File, HardDrive, Database, Search, ChevronRight,
    Download, Trash2,
    Share2, Grid, List, Plus
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { motion } from 'framer-motion';

const FileSystem: React.FC = () => {
    const [view, setView] = useState<'grid' | 'list'>('grid');
    
    const items = [
        { name: 'MODELS', type: 'folder', size: '12.4 GB', modified: '2026-02-27' },
        { name: 'CONFIGS', type: 'folder', size: '142 KB', modified: '2026-02-26' },
        { name: 'LOGS_ARCHIVE', type: 'folder', size: '1.2 GB', modified: '2026-02-25' },
        { name: 'system_core.bin', type: 'file', size: '256 MB', modified: '2026-02-27' },
        { name: 'mcp_manifest.json', type: 'file', size: '4 KB', modified: '2026-02-27' },
        { name: 'handshake.pem', type: 'file', size: '2 KB', modified: '2026-02-20' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <HardDrive size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Storage Explorer</h1>
                    </div>
                    <p className="text-zinc-400 text-sm max-w-xl font-medium">
                        Access and manage substrate data volumes.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setView('grid')}
                            className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            <Grid size={16} />
                        </button>
                        <button 
                            onClick={() => setView('list')}
                            className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl border border-emerald-400/20 text-[10px] font-black uppercase tracking-widest transition-all">
                        <Plus size={14} />
                        Upload
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Stats Sidebar */}
                <div className="space-y-6">
                    <GlassCard className="p-6 space-y-8">
                        <div>
                            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Volume Utilization</h3>
                            <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: '64%' }}
                                    transition={{ duration: 1.5 }}
                                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-[9px] font-black uppercase tracking-tighter">
                                <span className="text-emerald-400">12.4 TB USED</span>
                                <span className="text-zinc-700">30 TB TOTAL</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Connectors</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <Database size={14} className="text-blue-400" />
                                        <span className="text-[10px] font-bold text-white uppercase">CloudVault</span>
                                    </div>
                                    <ChevronRight size={14} className="text-zinc-700" />
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <HardDrive size={14} className="text-purple-400" />
                                        <span className="text-[10px] font-bold text-white uppercase">Local_4090</span>
                                    </div>
                                    <ChevronRight size={14} className="text-zinc-700" />
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* File Grid */}
                <div className="md:col-span-3 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest">
                            <span className="text-zinc-600">Root</span>
                            <ChevronRight size={12} className="text-zinc-800" />
                            <span>System</span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={12} />
                            <input 
                                type="text"
                                placeholder="FIND_ASSET..."
                                className="bg-black/40 border border-white/10 rounded-lg pl-8 pr-4 py-1.5 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all w-48"
                            />
                        </div>
                    </div>

                    <div className={view === 'grid' ? "grid grid-cols-2 lg:grid-cols-4 gap-4" : "space-y-2"}>
                        {items.map((item, idx) => (
                            <motion.div
                                key={item.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <GlassCard className={`p-4 group cursor-pointer hover:bg-white/[0.04] transition-all ${
                                    view === 'list' ? 'flex items-center justify-between' : ''
                                }`}>
                                    <div className={`flex items-center gap-4 ${view === 'grid' ? 'flex-col text-center' : ''}`}>
                                        <div className={`p-3 rounded-xl bg-white/5 border border-white/5 transition-transform group-hover:scale-110 ${
                                            item.type === 'folder' ? 'text-amber-500' : 'text-blue-400'
                                        }`}>
                                            {item.type === 'folder' ? <Folder size={24} /> : <File size={24} />}
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-black text-white uppercase tracking-tight truncate max-w-[120px]">{item.name}</div>
                                            <div className="text-[9px] text-zinc-600 font-mono">{item.size}</div>
                                        </div>
                                    </div>
                                    
                                    {view === 'list' && (
                                        <div className="flex items-center gap-8">
                                            <span className="text-[9px] text-zinc-700 font-mono">{item.modified}</span>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 text-zinc-600 hover:text-white"><Download size={14} /></button>
                                                <button className="p-1.5 text-zinc-600 hover:text-white"><Share2 size={14} /></button>
                                                <button className="p-1.5 text-zinc-600 hover:text-rose-400"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    )}
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileSystem;
