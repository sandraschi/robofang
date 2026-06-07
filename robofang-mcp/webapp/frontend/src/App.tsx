import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Cpu,
  Network,
  ShieldCheck,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppLayout } from './components/AppLayout';
import { ChatComposer } from './components/ChatComposer';
import { ChatMessage, ChatThread } from './components/ChatThread';
import { ComingSoonBadge } from './components/ComingSoonBadge';
import { GlassCard } from './components/GlassCard';
import { PulseBadge } from './components/PulseBadge';

interface FleetItem {
  id: string;
  url: string;
  status: 'active' | 'inactive';
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'system',
  content:
    'Chat with your local bridge (Ollama / council). Fleet and audit live in the sidebar — same backend as MCP robofang_ask.',
  timestamp: '',
};

type AppView = 'hub' | 'fleet' | 'audit' | 'settings' | 'integrations';

function App() {
  const [activeView, setActiveView] = useState<AppView>('hub');
  const [healthStatus, setHealthStatus] = useState<'ok' | 'error' | 'idle'>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [fleet, setFleet] = useState<FleetItem[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useCouncil, setUseCouncil] = useState(false);
  const [useRag, setUseRag] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/system/health');
      const data = await res.json();
      setHealthStatus(data.status === 'ok' ? 'ok' : 'error');
    } catch {
      setHealthStatus('error');
    }
  }, []);

  const fetchFleet = useCallback(async () => {
    try {
      const res = await fetch('/api/connectors/active');
      const data = await res.json();
      const raw = data.success ? data.active || [] : [];
      setFleet(
        raw.map((c: { id: string; url?: string }) => ({
          id: c.id,
          url: c.url || '',
          status: 'active' as const,
        }))
      );
    } catch {
      /* fleet optional for chat */
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchFleet();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchFleet]);

  const handleAsk = async () => {
    const text = prompt.trim();
    if (!text || isLoading) return;

    const ts = new Date().toLocaleTimeString();
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: ts,
    };
    const pendingId = `a-${Date.now()}`;
    const pendingMsg: ChatMessage = {
      id: pendingId,
      role: 'assistant',
      content: '',
      timestamp: ts,
      pending: true,
    };

    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/hands/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, use_council: useCouncil, use_rag: useRag }),
      });
      const data = await res.json();
      const reply =
        data.response ??
        data.message ??
        (data.success === false ? data.error : null) ??
        'No response from bridge.';
      const err = data.success === false;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                content: String(reply),
                pending: false,
                error: err,
                timestamp: new Date().toLocaleTimeString(),
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                content: 'Could not reach the bridge. Is it running on port 10871?',
                pending: false,
                error: true,
                timestamp: new Date().toLocaleTimeString(),
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout
      activeView={activeView}
      onViewChange={setActiveView}
      fleetCount={fleet.length}
      healthStatus={healthStatus}
    >
      {activeView === 'hub' && (
        <div className="flex flex-col gap-3 h-[calc(100vh-14rem)] max-w-3xl mx-auto w-full">
          <button
            type="button"
            onClick={() => setStatusOpen(!statusOpen)}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-slate-400 hover:bg-white/[0.06] shrink-0"
          >
            <span className="flex items-center gap-2">
              <PulseBadge
                status={healthStatus}
                label={healthStatus === 'ok' ? 'Bridge up' : healthStatus === 'error' ? 'Bridge down' : '…'}
              />
              <span className="text-slate-500">{fleet.length} active fleet nodes</span>
            </span>
            {statusOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {statusOpen && (
            <GlassCard title="Status" subtitle="Optional detail" icon={<Cpu size={18} />}>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={fetchHealth} className="text-xs" disabled={isLoading}>
                  <RefreshCw size={12} className={isLoading ? 'inline animate-spin' : 'inline'} /> Refresh
                </button>
              </div>
            </GlassCard>
          )}

          <ChatThread messages={messages} className="flex-1 min-h-0" />
          <ChatComposer
            value={prompt}
            onChange={setPrompt}
            onSend={handleAsk}
            isLoading={isLoading}
            useCouncil={useCouncil}
            onCouncilChange={setUseCouncil}
            useRag={useRag}
            onRagChange={setUseRag}
          />
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
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-600">
                      Transport: SSE/HTTP
                    </span>
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
                <span className="text-slate-300">Live:</span> bridge health polling; chat uses{' '}
                <code className="text-violet-300/90">POST /api/hands/ask</code>.
              </p>
              <p>
                <span className="text-slate-300">Not here yet:</span> SOC audit API, DefenseClaw telemetry, OpenShell
                reports.
              </p>
              <p className="text-xs text-slate-500 border-t border-white/10 pt-4">
                Supervisor heartbeat may run separately. <ComingSoonBadge label="UI planned" />
              </p>
            </div>
          </GlassCard>
        </div>
      )}

      {activeView === 'integrations' && (
        <div className="flex flex-col gap-6 max-w-4xl">
          <p className="text-sm text-slate-500">
            Third-party security products are <strong className="text-slate-400">not</strong> active in this webapp by
            default.
          </p>
          <div className="grid gap-4 md:grid-cols-1">
            <GlassCard title="Cisco DefenseClaw" subtitle="Governance / MCP ecosystem" icon={<ShieldCheck size={18} />}>
              <ComingSoonBadge />
              <p className="text-xs text-slate-400 mt-3">
                See <code className="text-violet-300/90">docs/SECURITY_INTEGRATIONS.md</code>.
              </p>
            </GlassCard>
            <GlassCard title="NVIDIA OpenShell" subtitle="Runtime hardening" icon={<ShieldCheck size={18} />}>
              <ComingSoonBadge />
            </GlassCard>
            <GlassCard title="Bastio" subtitle="Gateway (bastio.com)" icon={<ShieldCheck size={18} />}>
              <ComingSoonBadge />
            </GlassCard>
          </div>
        </div>
      )}

      {activeView === 'settings' && (
        <div className="max-w-xl space-y-4">
          <GlassCard title="Settings" subtitle="Hub preferences" icon={<Settings size={18} />}>
            <p className="text-sm text-slate-400">
              Theme and account <ComingSoonBadge className="ml-1 align-middle" /> — streaming chat{' '}
              <ComingSoonBadge label="Planned" className="ml-1 align-middle" />.
            </p>
          </GlassCard>
        </div>
      )}
    </AppLayout>
  );
}

export default App;
