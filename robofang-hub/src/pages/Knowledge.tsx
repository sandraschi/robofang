import React from 'react';
import { Search, Database, Fingerprint, ExternalLink, ShieldCheck, Cpu } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';

const Knowledge: React.FC = () => {
    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            <header>
                <h2 className="text-4xl font-bold font-gradient mb-2">Knowledge Orchestration</h2>
                <p className="text-text-secondary text-sm">Semantic retrieval across sovereign memories and ADN fragments.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <GlassCard className="flex flex-col group h-full">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-105 transition-transform">
                        <Database size={28} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Local Context</h3>
                    <p className="text-text-secondary text-sm mb-6 leading-relaxed">Indexed file contents and active project state from the root directory.</p>
                    <div className="mt-auto flex gap-3">
                        <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-text-secondary uppercase tracking-wider">124 Files</span>
                        <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-text-secondary uppercase tracking-wider">8.4MB</span>
                    </div>
                </GlassCard>

                <GlassCard className="flex flex-col group h-full">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-105 transition-transform">
                        <Fingerprint size={28} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">ADN Semantic Store</h3>
                    <p className="text-text-secondary text-sm mb-6 leading-relaxed">Fragmented memories synchronized via Advanced Memory MCP.</p>
                    <div className="mt-auto flex gap-3">
                        <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-text-secondary uppercase tracking-wider">62 Fragments</span>
                        <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                           <ShieldCheck size={12} /> Synchronized
                        </span>
                    </div>
                </GlassCard>
            </div>

            <GlassCard className="p-0 overflow-hidden" title="Semantic Fragments">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4 flex-1">
                        <Search className="text-text-secondary" size={16} />
                        <input
                            type="text"
                            placeholder="Search semantic fragments..."
                            className="bg-transparent border-none outline-none text-sm text-text-primary w-full max-w-md placeholder:text-text-secondary/30 font-medium"
                        />
                    </div>
                    <button
                        className="text-[10px] font-black text-indigo-400 flex items-center gap-2 hover:text-indigo-300 uppercase tracking-widest px-4 py-2 hover:bg-white/5 rounded-xl transition-all border border-white/5"
                    >
                        Neural Lab <ExternalLink size={12} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[10px] font-black uppercase tracking-widest text-text-secondary bg-white/[0.04]">
                            <tr>
                                <th className="px-8 py-5 border-r border-white/5 w-40">Origin</th>
                                <th className="px-8 py-5">Fragment Telemetry</th>
                                <th className="px-8 py-5 text-right w-32">Recency</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-black/20">
                            <FragmentRow source="internal" text="Fleet status verified: Persistence layer active." time="2h ago" />
                            <FragmentRow source="adn" text="Previous session notes found regarding 'industrial-grade logic'." time="1d ago" />
                            <FragmentRow source="internal" text="RBAC policies initialized for sovereign subject." time="3d ago" />
                            <FragmentRow source="adn" text="Memory vault compaction completed successfully." time="5d ago" />
                        </tbody>
                    </table>
                </div>
            </GlassCard>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="p-6 rounded-3xl glass-panel border border-white/5 flex flex-col items-center text-center gap-3 shadow-xl">
                  <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                     <Cpu size={20} />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-text-secondary">Embeddings Model</h4>
                  <p className="text-sm font-bold font-mono">text-embedding-3-small</p>
               </div>
               <div className="p-6 rounded-3xl glass-panel border border-white/5 flex flex-col items-center text-center gap-3 shadow-xl">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
                     <Database size={20} />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-text-secondary">Vector Store</h4>
                  <p className="text-sm font-bold font-mono">LanceDB (SOTA-2026)</p>
               </div>
               <div className="p-6 rounded-3xl glass-panel border border-white/5 flex flex-col items-center text-center gap-3 shadow-xl">
                  <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                     <Fingerprint size={20} />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-text-secondary">Namespace</h4>
                  <p className="text-sm font-bold font-mono">robofang_production</p>
               </div>
            </div>
        </div>
    );
};

const FragmentRow = ({ source, text, time }: { source: string, text: string, time: string }) => (
    <tr className="hover:bg-white/[0.03] transition-colors cursor-pointer group">
        <td className="px-8 py-5 border-r border-white/5">
            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                source === 'adn' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            }`}>{source}</span>
        </td>
        <td className="px-8 py-5 text-text-primary font-medium text-sm group-hover:text-white transition-colors">
           <span className="text-text-secondary/40 mr-2 font-mono">#</span>
           {text}
        </td>
        <td className="px-8 py-5 text-text-secondary/50 font-mono text-[10px] text-right italic">{time}</td>
    </tr>
);

export default Knowledge;
