import React, { useState } from 'react';
import {
    Globe, Lock, Shield, RefreshCw, ChevronLeft, ChevronRight,
    Star, Layout, Maximize2, MoreHorizontal,
    Monitor, Radio, Cpu
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const Browser: React.FC = () => {
    const [url, setUrl] = useState('https://mcp-central.docs/standards/AGENT_PROTOCOLS.md');

    const favorites = [
        { name: 'Ollama Lab', icon: Cpu, url: 'localhost:11434' },
        { name: 'Plex Media', icon: Layout, url: 'plex.tv/web' },
        { name: 'MCP Docs', icon: Globe, url: 'mcp-central.docs' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <Globe size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">System Browser</h1>
                    </div>
                    <p className="text-zinc-400 text-sm max-w-xl font-medium">
                        Isolated sandboxed portal for substrate visual assets.
                    </p>
                </div>
            </header>

            <GlassCard className="flex flex-col overflow-hidden min-h-[700px]">
                {/* Browser Toolbar */}
                <div className="p-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-4">
                    <div className="flex items-center gap-1 shrink-0">
                        <button className="p-2 text-zinc-600 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                        <button className="p-2 text-zinc-600 hover:text-white transition-colors"><ChevronRight size={16} /></button>
                        <button className="p-2 text-zinc-600 hover:text-white transition-colors"><RefreshCw size={14} /></button>
                    </div>

                    <div className="flex-1 relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Lock size={12} className="text-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-tighter">SECURED</span>
                        </div>
                        <input 
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-xl pl-20 pr-10 py-2.5 text-[11px] font-bold text-zinc-300 outline-none focus:border-indigo-500/50 transition-all font-mono"
                        />
                        <Star className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-amber-400 cursor-pointer transition-colors" size={14} />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <button className="p-2 text-zinc-600 hover:text-white transition-colors"><Maximize2 size={14} /></button>
                        <button className="p-2 text-zinc-600 hover:text-white transition-colors"><MoreHorizontal size={14} /></button>
                    </div>
                </div>

                {/* Sidebar & Content Area */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Favorites Sidebar */}
                    <div className="w-64 border-r border-white/5 bg-black/20 p-4 space-y-6 hidden md:block">
                        <div className="space-y-4">
                            <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-2">Knowledge Bases</h3>
                            <div className="space-y-1">
                                {favorites.map(fav => (
                                    <button key={fav.name} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 group transition-all text-left">
                                        <div className="p-1.5 rounded-md bg-white/5 text-zinc-600 group-hover:text-indigo-400 transition-colors">
                                            <fav.icon size={14} />
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-500 group-hover:text-white uppercase transition-colors">{fav.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-10 border-t border-white/5 opacity-50">
                            <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-2">System Fleet</h3>
                            <div className="space-y-1">
                                <button className="w-full flex items-center gap-3 p-2 rounded-lg text-left">
                                    <Monitor size={14} className="text-zinc-700" />
                                    <span className="text-[10px] font-bold text-zinc-700 uppercase">LOCAL_OS_VIEW</span>
                                </button>
                                <button className="w-full flex items-center gap-3 p-2 rounded-lg text-left">
                                    <Radio size={14} className="text-zinc-700" />
                                    <span className="text-[10px] font-bold text-zinc-700 uppercase">REMOTE_NODE_01</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Web Content Render (Mockup) */}
                    <div className="flex-1 bg-black/60 relative">
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8 animate-pulse">
                            <div className="p-8 rounded-full bg-white/[0.02] border border-white/5">
                                <Shield size={80} className="text-zinc-800" />
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">Sandbox Initializing</h2>
                                <p className="text-[10px] text-zinc-600 font-mono italic">Awaiting secure visual buffer handshake...</p>
                            </div>
                        </div>
                        
                        {/* Fake UI Overlay */}
                        <div className="absolute top-4 right-4 flex gap-2">
                            <span className="px-2 py-1 rounded bg-black/80 border border-white/10 text-[8px] font-mono text-emerald-500">HTTPS_V3</span>
                            <span className="px-2 py-1 rounded bg-black/80 border border-white/10 text-[8px] font-mono text-zinc-500">FPS: 60</span>
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default Browser;
