import React from 'react';
import { LayoutGrid, Plus, Search, Terminal } from 'lucide-react';

export default function Apps() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">App Hub</h1>
                <p className="text-slate-400 mt-2">OpenFang ecosystem expansion and modular agentic nodes.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="group relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] transition-all">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Terminal className="text-indigo-400" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Cluster Controller</h3>
                    <p className="text-sm text-slate-400 mb-6">Execution orchestration for distributed LLM clusters.</p>
                    <button className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all">Manage Node</button>
                </div>
            </div>
        </div>
    );
}
