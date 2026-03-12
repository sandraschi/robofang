import React, { useState } from 'react';
import { 
  Rocket, Shield, Cpu, MessageSquare, 
  Plus, CheckCircle2, ChevronRight, HelpCircle,
  Terminal, Globe, ExternalLink, Zap
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';

const Onboarding: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const steps = [
    { id: 'welcome', title: 'Intelligence Genesis', icon: Rocket, summary: 'Initiate your RoboFang substrate.' },
    { id: 'nodes', title: 'Fleet Registration', icon: Cpu, summary: 'Connect MCP servers and webapps.' },
    { id: 'comms', title: 'Neural Links', icon: MessageSquare, summary: 'Configure Discord and Telegram bridges.' },
    { id: 'finish', title: 'Substrate Ready', icon: Shield, summary: 'Finalize your deployment.' },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
          <Zap size={12} />
          <span>System Initialization</span>
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter">
          RoboFang <span className="text-amber-500">Onboarding</span>
        </h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto font-medium leading-relaxed">
          Configure your SOTA substrate, connect your fleet components, and establish secure communication channels for autonomous orchestration.
        </p>
      </header>

      {/* Progress Stepper */}
      <div className="flex justify-between items-center relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -z-10" />
        {steps.map((step, idx) => (
          <button
            key={step.id}
            onClick={() => idx <= activeStep && setActiveStep(idx)}
            className={`relative group flex flex-col items-center gap-3 transition-all ${
              idx <= activeStep ? 'text-amber-400' : 'text-zinc-600'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${
              idx === activeStep 
                ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                : idx < activeStep 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-black/40 border-white/10'
            }`}>
              {idx < activeStep ? <CheckCircle2 size={24} /> : <step.icon size={24} />}
            </div>
            <div className="absolute -bottom-8 whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                {step.title}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeStep === 0 && <WelcomeStep onNext={() => setActiveStep(1)} />}
            {activeStep === 1 && <NodeRegistrationStep 
                onNext={() => setActiveStep(2)} 
                setIsSubmitting={setIsSubmitting}
                setSuccess={setSuccess}
            />}
            {activeStep === 2 && <CommsSetupStep 
                onNext={() => setActiveStep(3)} 
                setIsSubmitting={setIsSubmitting}
                setSuccess={setSuccess}
            />}
            {activeStep === 3 && <FinishStep />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Global Notifications */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-50 p-4 rounded-xl bg-emerald-500/90 text-white shadow-2xl backdrop-blur-md flex items-center gap-3 border border-emerald-400/50"
            onClick={() => setSuccess(null)}
          >
            <CheckCircle2 size={20} />
            <span className="text-sm font-bold uppercase tracking-tight">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// -- Step Components --

const WelcomeStep = ({ onNext }: { onNext: () => void }) => (
  <GlassCard className="p-10 space-y-8 overflow-hidden relative group">
    <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full" />
    
    <div className="space-y-6 relative">
      <h2 className="text-3xl font-black text-white tracking-tight">Intelligence Genesis Initiated.</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
          <p>
            Welcome to RoboFang, the next-generation orchestrator for agentic intelligence and robotics fleets. 
            This onboarding wizard will guide you through the process of establishing your local mesh network.
          </p>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-3">
            <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Architecture Principles</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Shield size={12} className="text-emerald-400" />
                <span>Sovereign Security: Data remains within your control.</span>
              </li>
              <li className="flex items-center gap-2">
                <Cpu size={12} className="text-blue-400" />
                <span>Modular Hands: Extend capabilities via MCP plug-ins.</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe size={12} className="text-purple-400" />
                <span>Global Fleet: Access any node through a unified gateway.</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="relative aspect-video rounded-2xl border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center italic text-zinc-600 text-[10px] uppercase font-bold">
          [GENESIS_VISUALIZATION_PLACEHOLDER]
        </div>
      </div>
      
      <div className="pt-6 flex justify-end">
        <button 
          onClick={onNext}
          className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-amber-500 text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-amber-400 transition-all active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
        >
          Initialize Mesh
          <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  </GlassCard>
);

const NodeRegistrationStep = ({ onNext, setIsSubmitting, setSuccess }: any) => {
  const [formData, setFormData] = useState({
    category: 'nodes',
    id: '',
    name: '',
    url: '',
    type: 'server'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/fleet/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formData.category,
          id: formData.id,
          config: {
            name: formData.name,
            url: formData.url,
            type: formData.type,
            enabled: true
          }
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(`Registered ${formData.name} successfully.`);
        // Don't auto-proceed, let them add more or move on
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassCard className="p-10 space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight italic">Fleet Expansion</h2>
          <p className="text-zinc-500 text-xs font-medium">Connect external MCP servers or RoboFang-compatible webapps.</p>
        </div>
        <div className="flex items-center gap-2 text-amber-400/50">
          <HelpCircle size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest hover:text-amber-400 cursor-help transition-colors">Documentation</span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Component Category</label>
          <select 
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none outline-none focus:border-amber-500/50"
          >
            <option value="nodes">Fleet Node (Webapp/Agent)</option>
            <option value="connectors">Connector (MCP Server)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Internal ID</label>
          <input 
            type="text" 
            placeholder="e.g. creative-studio-01"
            value={formData.id}
            onChange={(e) => setFormData({...formData, id: e.target.value})}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Display Name</label>
          <input 
            type="text" 
            placeholder="e.g. Creative Hub"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Endpoint URL</label>
          <input 
            type="text" 
            placeholder="http://localhost:10720"
            value={formData.url}
            onChange={(e) => setFormData({...formData, url: e.target.value})}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50 font-mono"
          />
        </div>
        <div className="md:col-span-2 pt-4 flex gap-4">
          <button 
            type="submit"
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add to Topography
          </button>
        </div>
      </form>

      <div className="pt-6 border-t border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2 p-2 px-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
          <CheckCircle2 size={12} />
          <span>Nodes persist in federation_map.json</span>
        </div>
        <button 
          onClick={onNext}
          className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest hover:text-amber-400 transition-colors"
        >
          Skip / Continue
          <ChevronRight size={14} />
        </button>
      </div>
    </GlassCard>
  );
};

const CommsSetupStep = ({ onNext, setSuccess }: any) => {
  const [comms, setComms] = useState({
    telegram_token: '',
    discord_token: '',
    discord_channel: ''
  });

  const handleSave = async () => {
    try {
      const response = await fetch('/api/settings/comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comms),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Communication bridges established.');
        onNext();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <GlassCard className="p-10 space-y-8">
      <h2 className="text-2xl font-black text-white tracking-tight italic">Neural Links (Comms)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-sky-500/5 border border-sky-500/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400"><MessageSquare size={20} /></div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Telegram Bridge</h4>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Bot Token</label>
              <input 
                type="password" 
                placeholder="BOT_TOKEN"
                value={comms.telegram_token}
                onChange={(e) => setComms({...comms, telegram_token: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-sky-500/50 font-mono"
              />
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400"><Shield size={20} /></div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Discord Bridge</h4>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Bot Token</label>
                <input 
                  type="password" 
                  placeholder="BOT_TOKEN"
                  value={comms.discord_token}
                  onChange={(e) => setComms({...comms, discord_token: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500/50 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Primary Channel ID</label>
                <input 
                  type="text" 
                  placeholder="CHANNEL_ID"
                  value={comms.discord_channel}
                  onChange={(e) => setComms({...comms, discord_channel: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500/50 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Guide: Remote Ops</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Establishing stable communication bridges allows the RoboFang Sovereign to notify you of critical alerts and receive commands remotely via encrypted chat sessions.
            </p>
            <div className="flex flex-col gap-2">
              <a href="#" className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-2 mt-2">
                <ExternalLink size={12} />
                Get Telegram Bot Token
              </a>
              <a href="#" className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-2">
                <ExternalLink size={12} />
                Discord Developer Portal
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <button 
          onClick={onNext}
          className="px-6 py-3 rounded-xl border border-white/10 text-zinc-500 font-black text-[10px] uppercase tracking-widest hover:text-white"
        >
          Skip
        </button>
        <button 
          onClick={handleSave}
          className="px-8 py-3 rounded-xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-all shadow-[0_4px_20px_rgba(245,158,11,0.3)]"
        >
          Synchronize Bridges
        </button>
      </div>
    </GlassCard>
  );
};

const FinishStep = () => (
  <GlassCard className="p-16 text-center space-y-8 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
    <motion.div 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="inline-flex p-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto"
    >
      <CheckCircle2 size={64} />
    </motion.div>
    <div className="space-y-4">
      <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Substrate Ready.</h2>
      <p className="text-zinc-500 text-sm max-w-md mx-auto">
        Your RoboFang substrate is now fully configured and synchronized. 
        The system is operational and awaiting instructions.
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
      <a href="/" className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
        <Terminal size={20} className="mb-2 text-amber-400 mx-auto" />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">Dashboard</span>
      </a>
      <a href="/fleet" className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
        <Cpu size={20} className="mb-2 text-zinc-400 group-hover:text-amber-400 mx-auto" />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">Fleet Hub</span>
      </a>
      <a href="/chat" className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
        <MessageSquare size={20} className="mb-2 text-zinc-400 group-hover:text-amber-400 mx-auto" />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">Neural Chat</span>
      </a>
    </div>
  </GlassCard>
);

export default Onboarding;
