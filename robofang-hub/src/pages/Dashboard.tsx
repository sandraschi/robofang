import React from 'react';
import GlassCard from '../components/ui/GlassCard';
import { Activity, Beaker, Cpu, Globe, Hand, Layers, Shield, Zap } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold font-gradient mb-2 underline decoration-cyan-500/30 underline-offset-8">System Overview</h2>
          <p className="text-text-secondary">Comprehensive state analysis of the RoboFang Fleet.</p>
        </div>
        <div className="flex gap-4">
          <div className="glass-panel px-4 py-2 flex items-center gap-2 border-cyan-500/20">
            <div className="w-2 h-2 rounded-full bg-accent-success shadow-[0_0_8px_var(--accent-success)]" />
            <span className="text-xs font-bold uppercase tracking-tighter">System: Online</span>
          </div>
        </div>
      </header>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Cpu className="text-cyan-400" />} label="CPU Grid" value="12.4%" subValue="+2.1% spike" />
        <StatCard icon={<Layers className="text-purple-400" />} label="Memory Substrate" value="4.2 GB" subValue="64GB Available" />
        <StatCard icon={<Zap className="text-yellow-400" />} label="Agency Pulse" value="High" subValue="107ms Latency" />
        <StatCard icon={<Shield className="text-green-400" />} label="Security" value="Verified" subValue="Zero Breaches" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Observation Deck */}
        <GlassCard className="lg:col-span-2 min-h-[400px]" title="Fleet Status">
          <div className="h-64 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent rounded-xl" />
            <div className="flex items-end gap-1 h-32">
              {Array.from({ length: 20 }).map((_, i) => {
                const height = 20 + (i * 7) % 80; // Deterministic "random" height
                const opacity = 0.4 + (i * 3) % 6 / 10;
                return (
                  <div 
                    key={i} 
                    className="dash-bar-item"
                    style={{ "--h": `${height}%`, "--o": opacity } as React.CSSProperties}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
            <div className="absolute flex flex-col items-center gap-2">
              <Activity className="text-cyan-400 animate-pulse" size={48} />
              <span className="text-sm font-bold tracking-widest uppercase opacity-50">Active Metrics</span>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <span className="block text-xs text-text-secondary uppercase mb-1">Total Units</span>
              <span className="text-2xl font-bold font-gradient">12</span>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <span className="block text-xs text-text-secondary uppercase mb-1">Idle</span>
              <span className="text-2xl font-bold font-gradient">4</span>
            </div>
          </div>
        </GlassCard>

        {/* Rapid Actions */}
        <div className="space-y-6">
          <GlassCard title="Recent Activity">
            <div className="space-y-4">
              <ActionItem icon={<Globe size={16} />} title="Network Migration" time="2m ago" />
              <ActionItem icon={<Beaker size={16} />} title="New Device Detected" time="15m ago" />
              <ActionItem icon={<Hand size={16} />} title="Access Request" time="1h ago" />
            </div>
          </GlassCard>
          
          <GlassCard title="System Health">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">Supervisor</span>
                <span className="text-accent-success font-bold">STABLE</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">Bridge</span>
                <span className="text-accent-success font-bold">STABLE</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">RAG Index</span>
                <span className="text-accent-warning font-bold">READY</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, subValue }: { icon: React.ReactNode, label: string, value: string, subValue: string }) => (
  <GlassCard className="flex flex-col gap-2 !p-5 hover:border-cyan-500/50 transition-colors">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-white/5">{icon}</div>
      <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">{label}</span>
    </div>
    <div className="mt-2">
      <span className="text-3xl font-bold tracking-tight">{value}</span>
      <span className="block text-[10px] text-text-secondary mt-1">{subValue}</span>
    </div>
  </GlassCard>
);

const ActionItem = ({ icon, title, time }: { icon: React.ReactNode, title: string, time: string }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/10 group">
    <div className="text-text-secondary group-hover:text-cyan-400 transition-colors">{icon}</div>
    <div className="flex-1">
      <span className="block text-sm font-medium">{title}</span>
      <span className="block text-[10px] text-text-secondary">{time}</span>
    </div>
  </div>
);

export default Dashboard;
