import React from 'react';
import { FileSearch, Hash, Clock, ShieldCheck, Map, Image as ImageIcon, Link2, ExternalLink } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const Evidence: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileSearch size={20} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Evidence</h1>
          </div>
          <p className="text-zinc-400 text-sm max-w-xl font-medium">
            Cryptographically signed truth-claims and immutable observation logs.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Verification Chain</div>
          {[
            { id: 'E-4021', type: 'Observation', msg: 'Vehicle proximity detected at Sector 7-G', time: '12:04:22', sig: '0x8f2a...3e19' },
            { id: 'E-4020', type: 'Signal', msg: 'Frequency shift in local network mesh', time: '11:58:10', sig: '0x4c12...9b02' },
            { id: 'E-4019', type: 'System', msg: 'Kernel integrity verified via TPM 2.0', time: '11:45:00', sig: '0x2d9e...f110' },
            { id: 'E-4018', type: 'Observation', msg: 'Environmental delta: Temperature spike +0.4C', time: '11:32:15', sig: '0x1a2b...3c4d' },
          ].map((item) => (
            <GlassCard key={item.id} className="p-4 border-l-2 border-l-emerald-500/30 hover:bg-white/[0.03] transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-emerald-400 font-mono tracking-tighter">{item.id}</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{item.type}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  <Clock size={10} />
                  <span className="text-[10px] font-mono">{item.time}</span>
                </div>
              </div>
              <div className="text-sm font-medium text-white mb-2">{item.msg}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500">
                  <ShieldCheck size={10} className="text-emerald-500" />
                  SHA-256: {item.sig}
                </div>
                <ExternalLink size={10} className="text-zinc-700 group-hover:text-emerald-400" />
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Hash size={16} className="text-emerald-400" />
              Evidence Types
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Logs', icon: Clock, count: '142' },
                { label: 'Captures', icon: ImageIcon, count: '28' },
                { label: 'Grops', icon: Map, count: '12' },
                { label: 'Links', icon: Link2, count: '45' },
              ].map((type) => (
                <div key={type.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
                  <type.icon size={18} className="mx-auto text-zinc-500 mb-2" />
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{type.label}</div>
                  <div className="text-lg font-black text-white font-mono">{type.count}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6 bg-emerald-500/5 border-emerald-500/20">
             <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-tighter italic">Immutable Vault</h3>
             <p className="text-xs text-zinc-400 leading-relaxed">
               All evidence is automatically hashed and committed to the local ledger, ensuring total transparency in the reasoning pipeline.
             </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Evidence;
