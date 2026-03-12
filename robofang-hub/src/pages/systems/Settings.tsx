import React, { useState } from 'react';
import {
  Settings as SettingsIcon, User, ShieldCheck, Globe,
  Plus, RefreshCw, Key,
  Eye, Trash2,
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'personas', label: 'Personas', icon: User },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'bridge', label: 'Bridge', icon: Globe },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <SettingsIcon size={20} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">System Settings</h1>
        </div>
        <p className="text-zinc-400 text-sm max-w-xl font-medium">
          Configure substrate behavior, security policies, and persona parameters.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              <tab.icon size={18} />
              <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'general' && <GeneralSettings />}
              {activeTab === 'personas' && <PersonaSettings />}
              {activeTab === 'security' && <SecuritySettings />}
              {activeTab === 'bridge' && <BridgeSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// -- Components --

const GeneralSettings = () => (
  <GlassCard className="p-8 space-y-8">
    <div className="space-y-6">
      <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-4">Identification</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="nodeName" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Node Name</label>
          <input 
            id="nodeName"
            type="text" 
            defaultValue="Alsergrund-Primary-01"
            placeholder="Node Name"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 outline-none transition-all"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="environment" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Environment</label>
          <select 
            id="environment"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:border-amber-500/50 outline-none transition-all"
          >
            <option>Production (Stable)</option>
            <option>Development</option>
            <option>Research Scaffolding</option>
          </select>
        </div>
      </div>
    </div>

    <div className="space-y-6">
      <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-4">Capabilities</h3>
      <div className="space-y-4">
        {[
          { id: 'telemetry', label: 'Substrate Telemetry', desc: 'Broadcast real-time sensor data to the Council.' },
          { id: 'automancy', label: 'Automancy Bridge', desc: 'Allow autonomous logic execution beyond oversight.' },
          { id: 'federation', label: 'Federation Discovery', desc: 'Sync with neighboring RoboFang nodes via mDNS.' },
        ].map((feat) => (
          <div key={feat.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="space-y-1">
              <div className="text-xs font-bold text-white uppercase">{feat.label}</div>
              <div className="text-[10px] text-zinc-500 font-medium">{feat.desc}</div>
            </div>
            <button 
              title={`Toggle ${feat.label}`}
              className="w-10 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center px-1"
            >
              <div className="w-4 h-4 rounded-full bg-amber-400 translate-x-4" />
            </button>
          </div>
        ))}
      </div>
    </div>

    <div className="pt-4 flex justify-end">
      <button 
        title="Save Changes"
        className="px-8 py-3 rounded-xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-[0.2em] hover:bg-amber-400 transition-all active:scale-95"
      >
        Save Changes
      </button>
    </div>
  </GlassCard>
);

const PersonaSettings = () => (
  <GlassCard className="p-8 space-y-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-black text-white uppercase tracking-widest">Active Personas</h3>
      <button 
        title="Add Persona"
        className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all font-bold"
      >
        <Plus size={16} />
      </button>
    </div>
    
    <div className="space-y-4">
      {[
        { name: 'Materialist', role: 'Primary Assistant', color: 'cyan' },
        { name: 'Reductio', role: 'Technical Critic', color: 'purple' },
        { name: 'Vortex', role: 'Creative Liaison', color: 'amber' },
      ].map((persona) => (
        <div key={persona.name} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg bg-${persona.color}-500/10 border border-${persona.color}-500/20 text-${persona.color}-400 flex items-center justify-center`}>
              <User size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white uppercase">{persona.name}</div>
              <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter">{persona.role}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button title="Edit Persona" className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all"><SettingsIcon size={14} /></button>
            <button title="Delete Persona" className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  </GlassCard>
);

const SecuritySettings = () => (
  <GlassCard className="p-8 space-y-8">
     <div className="space-y-6">
      <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-4">Auth Tokens</h3>
      <div className="space-y-4">
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key size={16} className="text-amber-400" />
              <div className="text-xs font-mono text-zinc-400">••••••••••••••••••••••••••••••••</div>
            </div>
            <div className="flex items-center gap-2">
              <button title="View Token" className="p-2 rounded-lg hover:bg-white/5 text-zinc-500"><Eye size={14} /></button>
              <button title="Refresh Token" className="p-2 rounded-lg hover:bg-white/5 text-zinc-500"><RefreshCw size={14} /></button>
            </div>
          </div>
      </div>
    </div>
    
    <div className="space-y-6">
      <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-4">Access Control</h3>
      <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/20">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-red-400" />
          <div>
            <div className="text-xs font-bold text-white uppercase">Sovereign Mode</div>
            <div className="text-[10px] text-zinc-500 font-medium tracking-tight">Requires hardware key for critical substrate changes.</div>
          </div>
        </div>
        <button 
          title="Toggle Sovereign Mode"
          className="px-4 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/30"
        >
          Disabled
        </button>
      </div>
    </div>
  </GlassCard>
);

const BridgeSettings = () => (
  <GlassCard className="p-8 space-y-8">
    <div className="space-y-6">
      <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-4">Core Endpoints</h3>
      <div className="space-y-4">
        {[
          { label: 'Supervisor API', url: 'http://localhost:10871', status: 'online' },
          { label: 'Ollama Backend', url: 'http://localhost:11434', status: 'online' },
          { label: 'Unity/OSC Link', url: '127.0.0.1:9000', status: 'offline' },
        ].map((ep) => (
          <div key={ep.label} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div>
              <div className="text-xs font-bold text-white uppercase">{ep.label}</div>
              <div className="text-[10px] font-mono text-zinc-500 tracking-tight">{ep.url}</div>
            </div>
            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${ep.status === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
              {ep.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  </GlassCard>
);

export default Settings;
