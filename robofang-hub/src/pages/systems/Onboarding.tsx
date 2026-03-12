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
    { id: 'welcome', title: 'Get started', icon: Rocket, summary: 'Set up RoboFang.' },
    { id: 'nodes', title: 'Fleet', icon: Cpu, summary: 'Connect MCP servers and webapps.' },
    { id: 'comms', title: 'Comms', icon: MessageSquare, summary: 'Discord and Telegram (optional).' },
    { id: 'finish', title: 'Done', icon: Shield, summary: "You're all set." },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-widest">
          <Zap size={12} />
          <span>Setup</span>
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter">
          RoboFang <span className="text-amber-500">Onboarding</span>
        </h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto font-medium leading-relaxed">
          Connect your MCP servers, optional Discord/Telegram, and you're ready to go.
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
              <span className="text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
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
      <h2 className="text-3xl font-black text-white tracking-tight">Get started</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
          <p>
            Welcome to RoboFang. This wizard walks you through connecting MCP servers and optional Discord/Telegram. Everything runs locally; nothing is sent to the cloud unless you add external services.
          </p>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-3">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em]">How it works</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Shield size={12} className="text-emerald-400" />
                <span>Local first: data stays on your machine.</span>
              </li>
              <li className="flex items-center gap-2">
                <Cpu size={12} className="text-blue-400" />
                <span>MCP servers add tools (Blender, Plex, etc.).</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe size={12} className="text-purple-400" />
                <span>One dashboard to see and control your fleet.</span>
              </li>
            </ul>
          </div>
          <div className="pt-4">
            <button 
              onClick={onNext}
              className="group flex items-center justify-center gap-3 w-full md:w-auto min-w-[200px] px-10 py-4 rounded-2xl bg-amber-500 text-black font-black text-sm uppercase tracking-wide hover:bg-amber-400 transition-all active:scale-[0.98] shadow-[0_0_30px_rgba(245,158,11,0.4)] ring-2 ring-amber-400/50"
            >
              Start
              <ChevronRight size={20} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
        <div className="relative aspect-video rounded-2xl border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center text-zinc-600 text-xs">
          Optional: add a screenshot or diagram here
        </div>
      </div>
    </div>
  </GlassCard>
);

interface CatalogHand {
  id: string;
  name: string;
  category: string;
  description: string;
  repo_url: string;
}

interface InstallResult {
  hand_id: string;
  success: boolean;
  message?: string;
}

const NodeRegistrationStep = ({ onNext, setIsSubmitting, setSuccess }: any) => {
  const [hands, setHands] = useState<CatalogHand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState(false);
  const [lastResults, setLastResults] = useState<InstallResult[]>([]);
  const [launching, setLaunching] = useState<string | null>(null);

  const fetchCatalog = React.useCallback(() => {
    setLoadError(false);
    setLoading(true);
    fetch('/api/fleet/catalog')
      .then((r) => {
        if (!r.ok) throw new Error('Bridge returned ' + r.status);
        return r.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.hands)) {
          setHands(data.hands.filter((h: CatalogHand) => h.repo_url));
        } else {
          setLoadError(true);
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(hands.map((h) => h.id)));
  const clearAll = () => setSelected(new Set());

  const handleInstall = async () => {
    if (selected.size === 0) return;
    setInstalling(true);
    try {
      const toInstall = hands.filter((h) => selected.has(h.id)).map((h) => ({
        id: h.id,
        name: h.name,
        category: h.category,
        description: h.description,
        repo_url: h.repo_url,
      }));
      const response = await fetch('/api/fleet/onboard-from-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: toInstall }),
      });
      const data = await response.json();
      if (data.success && data.results?.length) {
        setLastResults(data.results);
        const ok = data.results.filter((r: { success: boolean }) => r.success).length;
        setSuccess(`Installed ${ok} of ${selected.size} from GitHub.`);
        setSelected(new Set());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInstalling(false);
    }
  };

  const launchWebapp = async (handId: string) => {
    setLaunching(handId);
    try {
      const r = await fetch(`/api/fleet/launch-hand/${encodeURIComponent(handId)}`, { method: 'POST' });
      const data = await r.json();
      if (data.success) setSuccess(`Launched webapp: ${handId}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLaunching(null);
    }
  };

  const byCategory = hands.reduce<Record<string, CatalogHand[]>>((acc, h) => {
    const c = h.category || 'Other';
    if (!acc[c]) acc[c] = [];
    acc[c].push(h);
    return acc;
  }, {});

  return (
    <GlassCard className="p-10 space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight">Add to fleet</h2>
          <p className="text-zinc-500 text-xs font-medium">Select MCP servers to install from GitHub (clone + setup). You can add more later from Fleet.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={selectAll} className="text-xs font-bold text-amber-400 hover:underline uppercase tracking-widest">Select all</button>
          <span className="text-zinc-600">|</span>
          <button type="button" onClick={clearAll} className="text-xs font-bold text-zinc-500 hover:underline uppercase tracking-widest">Clear</button>
        </div>
      </header>

      {loading ? (
        <div className="py-12 text-center text-zinc-500 text-sm">Loading catalog…</div>
      ) : loadError || hands.length === 0 ? (
        <div className="py-12 px-6 text-center space-y-4">
          <p className="text-sm text-zinc-400">
            {loadError
              ? 'Cannot reach the RoboFang bridge. Start the bridge first (e.g. from the repo run the bridge on port 10871), then click Retry.'
              : 'No catalog entries. The bridge may not have loaded the fleet manifest.'}
          </p>
          <button
            type="button"
            onClick={fetchCatalog}
            className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {items.map((h) => (
                  <label
                    key={h.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selected.has(h.id) ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(h.id)}
                      onChange={() => toggle(h.id)}
                      className="mt-1 rounded border-white/20 bg-black/40 text-amber-500 focus:ring-amber-500/50"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-white block">{h.name}</span>
                      {h.description && <span className="text-xs text-zinc-500 line-clamp-2">{h.description}</span>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleInstall}
              disabled={selected.size === 0 || installing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-black text-sm uppercase tracking-wide hover:bg-amber-400 disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              <Plus size={18} />
              {installing ? 'Installing…' : `Install ${selected.size} selected`}
            </button>
          </div>

          {lastResults.length > 0 && (
            <div className="pt-6 border-t border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white">Recently installed</h3>
              <div className="flex flex-wrap gap-2">
                {lastResults.filter((r) => r.success).map((r) => (
                  <div key={r.hand_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-sm text-white">{r.hand_id}</span>
                    <button
                      type="button"
                      onClick={() => launchWebapp(r.hand_id)}
                      disabled={launching === r.hand_id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-500/30 disabled:opacity-50"
                    >
                      <Globe size={14} />
                      {launching === r.hand_id ? '…' : 'Webapp'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pt-6 border-t border-white/5 flex justify-end">
        <button
          onClick={onNext}
          className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest hover:text-amber-400 transition-colors"
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
        setSuccess('Comms saved.');
        onNext();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <GlassCard className="p-10 space-y-8">
      <h2 className="text-2xl font-black text-white tracking-tight">Discord & Telegram</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-sky-500/5 border border-sky-500/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400"><MessageSquare size={20} /></div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Telegram Bridge</h4>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Bot Token</label>
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
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Bot Token</label>
                <input 
                  type="password" 
                  placeholder="BOT_TOKEN"
                  value={comms.discord_token}
                  onChange={(e) => setComms({...comms, discord_token: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500/50 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Primary Channel ID</label>
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
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Optional</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Connect Telegram or Discord so RoboFang can send you alerts and accept commands from chat.
            </p>
            <div className="flex flex-col gap-2">
              <a href="#" className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-2 mt-2">
                <ExternalLink size={12} />
                Get Telegram Bot Token
              </a>
              <a href="#" className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-2">
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
          className="px-6 py-3 rounded-xl border border-white/10 text-zinc-500 font-black text-xs uppercase tracking-widest hover:text-white"
        >
          Skip
        </button>
        <button 
          onClick={handleSave}
          className="px-8 py-3 rounded-xl bg-amber-500 text-black font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all shadow-[0_4px_20px_rgba(245,158,11,0.3)]"
        >
          Save
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
      <h2 className="text-4xl font-black text-white tracking-tighter">You're all set</h2>
      <p className="text-zinc-500 text-sm max-w-md mx-auto">
        Setup is complete. Use the dashboard and fleet pages to run and monitor your MCP servers.
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
      <a href="/" className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
        <Terminal size={20} className="mb-2 text-amber-400 mx-auto" />
        <span className="text-xs font-black text-white uppercase tracking-widest">Dashboard</span>
      </a>
      <a href="/fleet" className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
        <Cpu size={20} className="mb-2 text-zinc-400 group-hover:text-amber-400 mx-auto" />
        <span className="text-xs font-black text-white uppercase tracking-widest">Fleet Hub</span>
      </a>
      <a href="/chat" className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
        <MessageSquare size={20} className="mb-2 text-zinc-400 group-hover:text-amber-400 mx-auto" />
        <span className="text-xs font-black text-white uppercase tracking-widest">Chat</span>
      </a>
    </div>
  </GlassCard>
);

export default Onboarding;
