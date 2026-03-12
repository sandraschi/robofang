import React from 'react';
import { Bell, BellOff, Settings, AlertTriangle, Info, ShieldAlert, CheckCircle2, MoreHorizontal } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const Alerts: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
              <Bell size={20} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Alerts</h1>
          </div>
          <p className="text-zinc-400 text-sm max-w-xl font-medium">
            Real-time notifications and critical system status triggers.
          </p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-all">
            <BellOff size={16} /> Mute All
          </button>
           <button className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-zinc-400 hover:text-white transition-all">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-2">
             <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Notifications</div>
             <button className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline">Clear All</button>
          </div>

          {[
            { title: 'Critical: Unitree Battery Low', type: 'critical', msg: 'Unitree Go2 battery at 8%. Immediate recall initialized.', time: '2m ago', icon: AlertTriangle },
            { title: 'Unauthorized Scrape Attempt', type: 'warning', msg: 'Multiple failed auth attempts on Finance Scraper node.', time: '14m ago', icon: ShieldAlert },
            { title: 'Maintenance Window: Infrastructure', type: 'info', msg: 'Routine database optimization scheduled for 02:00 UTC.', time: '1h ago', icon: Info },
            { title: 'Knowledge Sync Complete', type: 'success', msg: 'Reasoning pipeline successfully indexed 142 new entities.', time: '3h ago', icon: CheckCircle2 },
          ].map((alert, i) => (
            <GlassCard key={i} className={`p-4 border-l-4 transition-all hover:bg-white/[0.02] cursor-pointer group ${
              alert.type === 'critical' ? 'border-l-red-500' :
              alert.type === 'warning' ? 'border-l-amber-500' :
              alert.type === 'success' ? 'border-l-emerald-500' : 'border-l-blue-500'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl mt-1 ${
                  alert.type === 'critical' ? 'bg-red-500/10 text-red-500' :
                  alert.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                  alert.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                }`}>
                  <alert.icon size={18} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{alert.title}</h3>
                    <span className="text-[10px] text-zinc-600 font-mono">{alert.time}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{alert.msg}</p>
                </div>
                <button className="p-1.5 text-zinc-700 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="space-y-6">
           <GlassCard className="p-6">
              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6">Subscription Status</h2>
              <div className="space-y-4">
                 {[
                   { label: 'Push (Mobile)', status: 'Enabled', active: true },
                   { label: 'Desktop (Global)', status: 'Enabled', active: true },
                   { label: 'Discord Webhook', status: 'Offline', active: false },
                   { label: 'Email Digest', status: 'Weekly', active: true },
                 ].map((sub) => (
                   <div key={sub.label} className="flex items-center justify-between">
                     <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">{sub.label}</span>
                     <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${sub.active ? 'text-emerald-500' : 'text-zinc-600'}`}>
                          {sub.status}
                        </span>
                        <div className={`w-1.5 h-1.5 rounded-full ${sub.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                     </div>
                   </div>
                 ))}
              </div>
           </GlassCard>

           <GlassCard className="p-6 bg-red-500/5 border-red-500/20">
              <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-tighter">Emergency Protocol</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Critical failures bypass all mute settings and initiate immediate system lockdown procedures.
              </p>
              <button className="w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase tracking-widest transition-all">
                Test Emergency Alarm
              </button>
           </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
