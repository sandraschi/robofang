import React, { useState } from 'react';
import { 
  Rocket, Shield, Cpu, MessageSquare, 
  CheckCircle2, ChevronRight, Plus, Loader2, XCircle,
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
    { id: 'comms', title: 'Comms', icon: MessageSquare, summary: 'Discord, Telegram, Email (optional).' },
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
            {activeStep === 1 && <NodeRegistrationStep onNext={() => setActiveStep(2)} setSuccess={setSuccess} />}
            {activeStep === 2 && <CommsSetupStep onNext={() => setActiveStep(3)} setSuccess={setSuccess} />}
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
          <p className="text-amber-400/90 font-medium">
            All configuration is done here. You do not need to edit any config files.
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
  repo_url?: string;
  requires_app?: string;
  app_install_url?: string;
}

interface InstallResult {
  hand_id: string;
  success: boolean;
  message?: string;
}

const NodeRegistrationStep = ({ onNext, setSuccess }: any) => {
  const [catalog, setCatalog] = useState<CatalogHand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalResults, setModalResults] = useState<InstallResult[]>([]);
  const [githubOwner, setGithubOwner] = useState('');
  const [fleetSaveStatus, setFleetSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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
          setCatalog(data.hands.filter((h: CatalogHand) => h.repo_url || h.id));
        } else {
          setLoadError(true);
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetch('/api/settings/fleet')
      .then((r) => r.ok ? r.json() : {})
      .then((data) => {
        if (data.github_owner != null) setGithubOwner(data.github_owner || '');
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  const saveFleetSettings = async () => {
    setFleetSaveStatus('saving');
    try {
      const r = await fetch('/api/settings/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_owner: githubOwner.trim() || undefined }),
      });
      const data = await r.json();
      if (data.success) {
        setFleetSaveStatus('saved');
        fetchCatalog();
        setTimeout(() => setFleetSaveStatus('idle'), 2000);
      } else {
        setFleetSaveStatus('idle');
      }
    } catch {
      setFleetSaveStatus('idle');
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(catalog.map((h) => h.id)));
  const clearAll = () => setSelected(new Set());

  const handleInstall = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setModalOpen(true);
    setModalLoading(true);
    setModalResults([]);
    setInstalling(true);
    try {
      const res = await fetch('/api/fleet/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hand_ids: ids }),
      });
      const data = await res.json();
      const results = data.results ?? [];
      setModalLoading(false);
      setModalResults(results);
      const ok = results.filter((r: InstallResult) => r.success).length;
      if (ok > 0) setSuccess(`Installed ${ok} of ${ids.length} MCP servers.`);
      setSelected(new Set());
    } catch (err) {
      setModalLoading(false);
      setModalResults(ids.map((hand_id) => ({ hand_id, success: false, message: (err as Error)?.message ?? 'Request failed' })));
    } finally {
      setInstalling(false);
    }
  };

  const byCategory = catalog.reduce<Record<string, CatalogHand[]>>((acc, h) => {
    const c = h.category || 'Other';
    if (!acc[c]) acc[c] = [];
    acc[c].push(h);
    return acc;
  }, {});

  return (
    <GlassCard className="p-10 space-y-8">
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
        <h3 className="text-sm font-black text-white uppercase tracking-widest">Fleet settings</h3>
        <p className="text-zinc-500 text-xs">Catalog source: the GitHub username or organization that owns the MCP server repos. Repos are cloned from <code className="bg-black/40 px-1 rounded">github.com/&lt;this value&gt;/&lt;repo-name&gt;</code>. Default <code className="bg-black/40 px-1 rounded">sandraschi</code> gives you the built-in catalog; change only if you use your own fork.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Default: sandraschi"
            value={githubOwner}
            onChange={(e) => setGithubOwner(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono outline-none focus:border-amber-500/50 w-48"
          />
          <button
            type="button"
            onClick={saveFleetSettings}
            disabled={fleetSaveStatus === 'saving'}
            className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest hover:bg-amber-500/30 disabled:opacity-50"
          >
            {fleetSaveStatus === 'saving' ? 'Saving…' : fleetSaveStatus === 'saved' ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight">Add to fleet</h2>
          <p className="text-zinc-500 text-xs font-medium">Select MCP servers to install (clone from GitHub + deps).</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={selectAll} className="text-xs font-bold text-amber-400 hover:underline uppercase tracking-widest">Select all</button>
          <span className="text-zinc-600">|</span>
          <button type="button" onClick={clearAll} className="text-xs font-bold text-zinc-500 hover:underline uppercase tracking-widest">Clear</button>
        </div>
      </header>

      {loading ? (
        <div className="py-12 text-center text-zinc-500 text-sm">Loading catalog…</div>
      ) : loadError || catalog.length === 0 ? (
        <div className="py-12 px-6 text-center space-y-4">
          <p className="text-sm text-zinc-400">
            {loadError ? 'Cannot reach the bridge. Run start_all.ps1 from repo root, then Retry.' : 'No catalog entries.'}
          </p>
          <button type="button" onClick={fetchCatalog} className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-500/30">Retry</button>
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
                      {h.requires_app && (
                        <p className="text-xs text-amber-400/90 mt-1">
                          Requires {h.requires_app} installed.
                          {h.app_install_url ? (
                            <a href={h.app_install_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="ml-1 underline hover:text-amber-300">Get {h.requires_app}</a>
                          ) : null}
                        </p>
                      )}
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
        </div>
      )}

      <div className="pt-6 border-t border-white/5 flex justify-end">
        <button onClick={onNext} className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest hover:text-amber-400 transition-colors">
          Skip / Continue <ChevronRight size={14} />
        </button>
      </div>

      {/* Install progress modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => !modalLoading && setModalOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className="text-base font-bold text-white">{modalLoading ? 'Installing…' : 'Install complete'}</h3>
                <p className="text-xs text-zinc-400 mt-1">{modalLoading ? 'Cloning and installing dependencies. This may take a few minutes.' : 'Review results below.'}</p>
              </div>
              <div className="px-6 py-4">
                {modalLoading ? (
                  <div className="flex items-center gap-4">
                    <Loader2 size={24} className="text-amber-400 animate-spin shrink-0" />
                    <span className="text-sm text-zinc-300">Running gh clone and dependency install…</span>
                  </div>
                ) : (
                  <div className="space-y-2 font-mono text-sm">
                    {modalResults.map((r) => {
                      const name = catalog.find((h) => h.id === r.hand_id)?.name ?? r.hand_id;
                      return (
                        <div key={r.hand_id} className="flex items-start gap-2">
                          {r.success ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" /> : <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />}
                          <div className="min-w-0">
                            <span className="text-white font-medium">{name}</span>
                            <span className={r.success ? ' text-emerald-400' : ' text-red-400'}>
                              {r.success ? ' Success' : ` Failed: ${r.message ?? 'unknown error'}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-white/10 flex justify-end">
                <button type="button" className="px-4 py-2 rounded-xl border border-white/20 text-zinc-300 text-sm font-bold hover:bg-white/10 disabled:opacity-50" onClick={() => setModalOpen(false)} disabled={modalLoading}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};

const CommsSetupStep = ({ onNext, setSuccess }: any) => {
  const [comms, setComms] = useState({
    telegram_token: '',
    telegram_chat_id: '',
    discord_webhook: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    smtp_from: '',
    imap_host: '',
    imap_port: '993',
    imap_user: '',
    imap_password: '',
    imap_folder: 'INBOX'
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
      <h2 className="text-2xl font-black text-white tracking-tight">Comms (optional)</h2>
      <p className="text-zinc-400 text-sm">
        Only needed if you want alerts or commands via Telegram, Discord, or Email. You can skip and set later in Settings.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-sky-500/5 border border-sky-500/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400"><MessageSquare size={20} /></div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Telegram</h4>
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Message <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">@BotFather</a>, send <code className="bg-black/40 px-1 rounded">/newbot</code>, then paste the bot token below. Get your chat ID by messaging <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">@userinfobot</a>.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Bot token</label>
              <input 
                type="password" 
                placeholder="From @BotFather"
                value={comms.telegram_token}
                onChange={(e) => setComms({...comms, telegram_token: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-sky-500/50 font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Your chat ID</label>
              <input 
                type="text" 
                placeholder="From @userinfobot"
                value={comms.telegram_chat_id}
                onChange={(e) => setComms({...comms, telegram_chat_id: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-sky-500/50 font-mono"
              />
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400"><Shield size={20} /></div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Discord</h4>
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed">
              In your server: Server Settings &rarr; Integrations &rarr; Webhooks &rarr; New Webhook. Copy the webhook URL and paste below.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Webhook URL</label>
              <input 
                type="password" 
                placeholder="https://discord.com/api/webhooks/..."
                value={comms.discord_webhook}
                onChange={(e) => setComms({...comms, discord_webhook: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500/50 font-mono"
              />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Nothing to prepare in advance</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">
              You get the Telegram token and chat ID in a few minutes from Telegram. The Discord webhook is one URL from your server settings. All optional; skip if you only use the hub in the browser.
            </p>
            <ul className="text-zinc-500 text-xs space-y-2 list-disc list-inside">
              <li>Telegram: @BotFather &rarr; /newbot &rarr; token; @userinfobot &rarr; chat ID</li>
              <li>Discord: Server &rarr; Integrations &rarr; Webhooks &rarr; copy URL</li>
            </ul>
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
