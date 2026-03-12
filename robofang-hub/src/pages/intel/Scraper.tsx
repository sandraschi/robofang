import React from 'react';
import { Search, Globe, Play, Square, RefreshCcw, ExternalLink, Database, Activity } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { motion } from 'framer-motion';

const Scraper: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Search size={20} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Scraper</h1>
          </div>
          <p className="text-zinc-400 text-sm max-w-xl font-medium">
            Manage automated web extraction tasks and target site health.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-cyan-400" />
                Active Tasks
              </h2>
              <button className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-widest transition-all">
                New Task
              </button>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Market Sentiment Scan', target: 'finance.yahoo.com', progress: 65, status: 'Running' },
                { name: 'Tech News Aggregator', target: 'techcrunch.com', progress: 100, status: 'Idle' },
                { name: 'Social Trend Analysis', target: 'x.com', progress: 12, status: 'Running' },
              ].map((task) => (
                <div key={task.name} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-cyan-500/20 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${task.status === 'Running' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                        <Globe size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{task.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono tracking-tighter">{task.target}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-all">
                        {task.status === 'Running' ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-all">
                        <RefreshCcw size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${task.progress}%` }}
                      className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{task.status}</span>
                    <span className="text-[9px] font-mono text-cyan-400">{task.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Database size={18} className="text-purple-400" />
              Resource Usage
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-500">Bandwidth (24h)</span>
                  <span className="text-white">1.2 GB</span>
                </div>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-[40%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-500">Proxy Health</span>
                  <span className="text-emerald-400">98.2%</span>
                </div>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[98%]" />
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 bg-cyan-500/5 border-cyan-500/20">
            <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-tighter">Documentation</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Learn how to build custom selectors and bypass anti-bot measures using the Robofang Crawler API.
            </p>
            <button className="w-full py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              View API Docs <ExternalLink size={12} />
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Scraper;
