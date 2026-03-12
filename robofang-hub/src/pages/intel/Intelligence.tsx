import React from 'react';
import { Zap, Shield, Cpu, Target, Network, Layers, TrendingUp, AlertCircle } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const Intelligence: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Zap size={20} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Intelligence</h1>
          </div>
          <p className="text-zinc-400 text-sm max-w-xl font-medium">
            Aggregated entity extraction and real-time event correlation engine.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Entities Tracked', value: '1,284', icon: Target, color: 'blue' },
          { label: 'Active Signals', value: '42', icon: Network, color: 'amber' },
          { label: 'Neural Load', value: '18%', icon: Cpu, color: 'purple' },
          { label: 'Threat Level', value: 'Low', icon: Shield, color: 'emerald' },
        ].map((stat) => (
          <GlassCard key={stat.label} className="p-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-400`}>
                <stat.icon size={24} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{stat.label}</div>
                <div className="text-2xl font-black text-white tracking-tighter">{stat.value}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-2 p-6 overflow-hidden relative">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-amber-400" />
              Event Correlation Map
            </h2>
            <TrendingUp size={18} className="text-zinc-600" />
          </div>
          <div className="h-[300px] w-full flex items-center justify-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
            <div className="text-center space-y-2">
              <Network size={48} className="text-zinc-800 mx-auto animate-pulse" />
              <p className="text-xs text-zinc-600 uppercase font-black tracking-widest italic">Visualizing Signal Proximity...</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-400" />
            Recent Anomalies
          </h2>
          <div className="space-y-4">
            {[
              { time: '2m ago', msg: 'Pattern shift in market feeds', level: 'minor' },
              { time: '14m ago', msg: 'Entity collision: Project X / Alpha', level: 'moderate' },
              { time: '1h ago', msg: 'System integrity re-verified', level: 'nominal' },
            ].map((anomaly, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                <div className="flex justify-between items-center">
                  <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded ${
                    anomaly.level === 'nominal' ? 'bg-emerald-500/10 text-emerald-500' :
                    anomaly.level === 'moderate' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {anomaly.level}
                  </span>
                  <span className="text-[10px] text-zinc-600 font-mono">{anomaly.time}</span>
                </div>
                <div className="text-xs text-zinc-300 font-medium">{anomaly.msg}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Intelligence;
