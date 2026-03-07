import React from 'react';
import { Search, Database, Fingerprint, ExternalLink } from 'lucide-react';

const Knowledge: React.FC = () => {
    return (
        <div className="page-grid">
            <div className="lg:col-span-12 mb-2">
                <h1 className="text-3xl font-bold text-white font-heading">Knowledge Orchestration</h1>
                <p className="text-slate-400 text-sm mt-1">Semantic retrieval across sovereign memories and ADN fragments.</p>
            </div>

            <div className="lg:col-span-6">
                <div className="page-card p-6 h-full flex flex-col group hover:border-indigo-500/30 transition-all cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-105 transition-transform">
                        <Database size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Local Context</h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">Indexed file contents and active project state from the root directory.</p>
                    <div className="mt-auto flex gap-3">
                        <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">124 Files</span>
                        <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">8.4MB</span>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-6">
                <div className="page-card p-6 h-full flex flex-col group hover:border-emerald-500/30 transition-all cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-105 transition-transform">
                        <Fingerprint size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">ADN Semantic Store</h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">Fragmented memories synchronized via Advanced Memory MCP.</p>
                    <div className="mt-auto flex gap-3">
                        <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">62 Fragments</span>
                        <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Synchronized</span>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-12">
                <div className="page-card flex flex-col p-0 overflow-hidden">
                    <div className="card-header p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-4 flex-1">
                            <Search className="text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search semantic fragments..."
                                className="bg-transparent border-none outline-none text-xs text-white w-full max-w-md placeholder:text-slate-700"
                            />
                        </div>
                        <button
                            className="text-[10px] font-bold text-indigo-400 flex items-center gap-2 hover:text-indigo-300 uppercase tracking-widest px-3 py-1.5 hover:bg-white/5 rounded-lg transition-all"
                            title="Open Knowledge Lab"
                        >
                            Open Lab <ExternalLink size={12} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/[0.02]">
                                <tr>
                                    <th className="px-8 py-4 font-bold border-r border-white/5 w-32">Source</th>
                                    <th className="px-8 py-4 font-bold">Fragment Telemetry</th>
                                    <th className="px-8 py-4 font-bold text-right">Recency</th>
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
                </div>
            </div>
        </div>
    );
};

const FragmentRow = ({ source, text, time }: { source: string, text: string, time: string }) => (
    <tr className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
        <td className="px-8 py-4 border-r border-white/5">
            <span className={`px-2 py-1 rounded-[4px] text-[9px] font-bold uppercase tracking-wider ${source === 'adn' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                }`}>{source}</span>
        </td>
        <td className="px-8 py-4 text-slate-300 font-mono text-[11px] group-hover:text-white transition-colors">{text}</td>
        <td className="px-8 py-4 text-slate-500 italic text-right font-mono">{time}</td>
    </tr>
);

export default Knowledge;
