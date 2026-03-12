import React from 'react';
import { BarChart3, PieChart, Activity, TrendingUp, Filter, Maximize2, Download } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const Analysis: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <BarChart3 size={20} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Analysis</h1>
          </div>
          <p className="text-zinc-400 text-sm max-w-xl font-medium">
            Deep data synthesis and trend projection for all extracted entities.
          </p>
        </div>
        <div className="flex gap-2">
           <button className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-zinc-400 hover:text-white transition-all">
            <Filter size={18} />
          </button>
           <button className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-zinc-400 hover:text-white transition-all">
            <Download size={18} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-2 p-6 h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-400" />
              Intelligence Velocity
            </h2>
            <Maximize2 size={14} className="text-zinc-600" />
          </div>
          <div className="flex-1 flex items-end gap-2 px-2">
            {[40, 70, 45, 90, 65, 80, 50, 95, 85, 100, 75, 40].map((h, i) => (
              <div key={i} className="flex-1 bg-gradient-to-t from-indigo-600/20 to-indigo-400/40 rounded-t-lg border-t border-indigo-400/30 transition-all hover:to-indigo-400/60" style={{ height: `${h}%` }} />
            ))}
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <PieChart size={16} className="text-purple-400" />
              Source Distribution
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Web Scrapes', value: '64%', color: 'indigo' },
                { label: 'OSINT Feeds', value: '22%', color: 'purple' },
                { label: 'Direct Signals', value: '14%', color: 'blue' },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-zinc-500 uppercase">{item.label}</span>
                    <span className="text-white font-mono">{item.value}</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full bg-${item.color}-500`} style={{ width: item.value }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" />
              System Confidence
            </h2>
            <div className="text-4xl font-black text-white tracking-tighter mb-1">94.2%</div>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">High Reliability State</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
