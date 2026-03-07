import React from 'react';
import { Wrench, Terminal, Cpu, Zap } from 'lucide-react';

export default function Tools() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Platform Tools</h1>
                <p className="text-slate-400 mt-2">Deep system analysis and low-level diagnostic instruments.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Zap className="text-emerald-400" size={20} />
                        </div>
                        <h3 className="font-bold text-white">Neural Profiler</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full w-[65%] bg-emerald-400 animate-pulse" />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            <span>Inference Load</span>
                            <span>65%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
