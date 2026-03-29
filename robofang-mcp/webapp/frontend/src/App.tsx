import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Send, 
  Cpu, 
  AlertCircle,
  Network,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { AppLayout } from './components/AppLayout';
import { ComingSoonBadge } from './components/ComingSoonBadge';
import { GlassCard } from './components/GlassCard';
import { PulseBadge } from './components/PulseBadge';
import { StreamingConsole } from './components/StreamingConsole';

interface LogEntry {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

interface FleetItem {
  id: string;
  url: string;
  status: 'active' | 'inactive';
}

type AppView = 'hub' | 'fleet' | 'audit' | 'settings' | 'integrations';

function App() {
  const [activeView, setActiveView] = useState<AppView>('hub');
  const [healthStatus, setHealthStatus] = useState<'ok' | 'error' | 'idle'>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fleet, setFleet] = useState<FleetItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      timestamp: new Date().toLocaleTimeString(),
      type
    };
    setLogs(prev => [...prev.slice(-99), newLog]);
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/system/health");
      const data = await res.json();
      setHealthStatus(data.status === 'ok' ? 'ok' : 'error');
      addLog(`System health check: ${data.status.toUpperCase()}`, data.status === 'ok' ? 'success' : 'error');
    } catch (err) {
      setHealthStatus('error');
      addLog("Failed to fetch system health status", "error");
    }
  }, [addLog]);

  const fetchFleet = useCallback(async () => {
    try {
      const res = await fetch("/api/connectors/active");
      const data = await res.json();
      const raw = data.success ? (data.active || []) : [];
      setFleet(
        raw.map((c: { id: string; url?: string }) => ({
          id: c.id,
          url: c.url || "",
          status: "active" as const,
        }))
      );
      addLog(`Fleet Deck synchronized: ${raw.length} active nodes`, "info");
    } catch (err) {
      addLog("Failed to sync fleet deck state", "error");
    }
  }, [addLog]);

  useEffect(() => {
    fetchHealth();
    fetchFleet();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchFleet]);

  const handleAsk = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    addLog(`Operator Query: ${prompt}`, "info");
    
    try {
      const res = await fetch("/api/hands/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      const text =
        data.response ??
        data.message ??
        (data.success === false ? data.error : null) ??
        JSON.stringify(data);
      addLog(`Council Reply: ${text}`, data.success !== false ? "success" : "error");
      setPrompt("");
    } catch (err) {
      addLog("Failed to transmit query to council bridge", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout activeView={activeView} onViewChange={setActiveView} fleetCount={fleet.length} healthStatus={healthStatus}>
      {activeView === 'hub' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-14rem)]">
          {/* Left Column: Control & Status */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <GlassCard 
              title="System Node" 
              subtitle="Real-time Operational Status"
              icon={<Cpu size={18} />}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-xs text-slate-400 font-medium">Bridge Integrity</span>
                  <PulseBadge
                    status={healthStatus}
                    label={healthStatus === 'ok' ? 'UP' : healthStatus === 'error' ? 'DOWN' : 'IDLE'}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-xs text-slate-400 font-medium">Active Fleet</span>
                  <span className="text-sm font-bold text-cyan-400">{fleet.length} nodes</span>
                </div>
                <button 
                  onClick={fetchHealth} 
                  className="w-full mt-2"
                  disabled={isLoading}
                >
                  <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                  Refresh Bridge
                </button>
              </div>
            </GlassCard>

            <GlassCard 
              title="Security posture" 
              subtitle="What is live vs planned"
              icon={<Activity size={18} />}
              className="flex-1"
            >
              <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Bridge health</span>
                    <span className="text-[10px] text-emerald-400/90">Live</span>
                  </div>
                  <p className="text-slate-500">From <code className="text-violet-300/90">GET /api/system/health</code> only.</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Vendor stack</span>
                    <ComingSoonBadge />
                  </div>
                  <p className="text-slate-500">
                    Cisco DefenseClaw, NVIDIA OpenShell, Bastio — planned; not wired in this UI. See repo{' '}
                    <code className="text-violet-300/90">docs/SECURITY_INTEGRATIONS.md</code>.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Console & Interaction */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <StreamingConsole logs={logs} className="flex-1 min-h-[400px]" />
            
            <div className="glass-panel p-2 flex gap-2">
              <input 
                type="text" 
                placeholder="Transmit intent to the bridge council..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                className="flex-1 bg-transparent border-none outline-none text-sm px-4 py-2 placeholder:text-slate-600 focus:placeholder:text-slate-500"
              />
              <button 
                onClick={handleAsk}
                disabled={isLoading || !prompt.trim()}
                className="bg-violet-600 hover:bg-violet-500 text-white p-2.5 rounded-lg active:scale-95 transition-all shadow-lg shadow-violet-900/40"
              >
                {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === 'fleet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fleet.length > 0 ? (
            fleet.map((item) => (
              <GlassCard 
                key={item.id} 
                title={item.id} 
                subtitle="Connector Node"
                icon={<Network size={18} />}
              >
                <div className="space-y-3">
                  <div className="text-[10px] font-mono text-slate-500 break-all bg-black/40 p-2 rounded border border-white/5">
                    {item.url}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-600">Transport: SSE/HTTP</span>
                    <PulseBadge status={item.status === 'active' ? 'ok' : 'idle'} label={item.status.toUpperCase()} />
                  </div>
                </div>
              </GlassCard>
            ))
          ) : (
            <div className="col-span-full py-20 text-center opacity-30 italic text-slate-400">
              No active connector nodes detected in the fleet repository.
            </div>
          )}
        </div>
      )}

      {activeView === 'audit' && (
        <div className="flex flex-col gap-6 max-w-4xl">
          <GlassCard title="System audit" subtitle="What this screen shows today" icon={<ShieldCheck size={18} />}>
            <div className="p-6 space-y-4 text-sm text-slate-400">
              <p>
                <span className="text-slate-300">Live:</span> operator log stream on this page (client-side), and bridge{' '}
                <code className="text-violet-300/90">/api/system/health</code> / fleet polling from the Hub tab.
              </p>
              <p>
                <span className="text-slate-300">Not here yet:</span> dedicated SOC-style audit API, DefenseClaw telemetry, or
                OpenShell policy reports. Those are roadmap items; the hub does not imply they are running.
              </p>
              <p className="text-xs text-slate-500 border-t border-white/10 pt-4">
                Optional hash / integrity jobs may run in other processes (e.g. supervisor); this SPA does not surface their output
                yet. <ComingSoonBadge label="UI planned" />
              </p>
            </div>
          </GlassCard>
        </div>
      )}

      {activeView === 'integrations' && (
        <div className="flex flex-col gap-6 max-w-4xl">
          <p className="text-sm text-slate-500">
            Third-party security products are <strong className="text-slate-400">not</strong> active inside this webapp by default.
            Labels below reflect roadmap intent only.
          </p>
          <div className="grid gap-4 md:grid-cols-1">
            <GlassCard title="Cisco DefenseClaw" subtitle="Governance / MCP ecosystem" icon={<ShieldCheck size={18} />}>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <ComingSoonBadge />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Evaluate sidecar and scanner patterns; see <code className="text-violet-300/90">docs/SECURITY_INTEGRATIONS.md</code>{' '}
                and <code className="text-violet-300/90">docs/EXTERNAL_AGENT_SECURITY_SCANNERS.md</code>.
              </p>
            </GlassCard>
            <GlassCard title="NVIDIA OpenShell" subtitle="Runtime hardening (reference)" icon={<ShieldCheck size={18} />}>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <ComingSoonBadge />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pattern adoption only until a concrete integration exists; no OpenShell runtime ships with RoboFang today.
              </p>
            </GlassCard>
            <GlassCard title="Bastio" subtitle="Gateway / injection defenses (bastio.com)" icon={<ShieldCheck size={18} />}>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <ComingSoonBadge />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                No Bastio adapter in the bridge yet; verify product claims on the vendor site before production reliance.
              </p>
            </GlassCard>
          </div>
        </div>
      )}

      {activeView === 'settings' && (
        <div className="max-w-xl space-y-4">
          <GlassCard title="Settings" subtitle="Hub preferences" icon={<Settings size={18} />}>
            <p className="text-sm text-slate-400">
              Account and theme controls are <ComingSoonBadge className="ml-1 align-middle" /> — not implemented in this build.
            </p>
          </GlassCard>
        </div>
      )}
    </AppLayout>
  );
}

export default App;
