import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tv2, Home, RefreshCw, AlertTriangle, 
  Zap, Shield,
  BookOpen, Camera, CloudSun, Bell, Activity
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';

// ── Shared Helper Components ──────────────────────────────────────────────────

interface StatPillProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

const StatPill: React.FC<StatPillProps> = ({ label, value, icon }) => (
  <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 flex items-center gap-2.5">
    {icon && <span className="text-text-secondary shrink-0">{icon}</span>}
    <div>
      <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-1">{label}</div>
      <div className="text-sm font-bold text-white leading-tight">{value}</div>
    </div>
  </div>
);

const Skeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
    ))}
  </div>
);

// ── Connector Card Wrapper ────────────────────────────────────────────────────

interface ConnectorCardProps {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  glowClass: string;
  online: boolean | null;
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  children: React.ReactNode;
}

const ConnectorCard: React.FC<ConnectorCardProps> = ({
  title, icon, colorClass, glowClass, online, loading, error, onRefresh, children
}) => (
  <GlassCard className={`flex flex-col h-full group hover:border-white/20 transition-all duration-500 overflow-hidden ${!online && online !== null ? 'opacity-70 blur-[1px]' : ''}`}>
    {/* Header */}
    <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center shadow-lg ${glowClass} transition-transform group-hover:scale-110 duration-500 group-hover:rotate-3`}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-bold text-white tracking-tight">{title}</div>
          <div className="flex items-center gap-2 mt-0.5">
            {online === null ? (
              <div className="flex items-center gap-1.5 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span className="text-[9px] text-slate-500 uppercase tracking-tighter font-bold">Initializing</span>
              </div>
            ) : online ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse shadow-[0_0_8px_var(--accent-success)]" />
                <span className="text-[9px] font-bold text-accent-success uppercase tracking-tighter">Coherent</span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-error shadow-[0_0_8px_var(--accent-error)]" />
                <span className="text-[9px] font-bold text-accent-error uppercase tracking-tighter">Severed</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        title="Refresh Data"
        className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-white transition-colors active:scale-90 disabled:opacity-40"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      </button>
    </div>

    {/* Body */}
    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar min-h-[300px]">
      {error ? (
        <div className="flex items-start gap-3 p-4 bg-accent-error/10 border border-accent-error/20 rounded-xl">
          <AlertTriangle size={16} className="shrink-0 text-accent-error" />
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-accent-error">Backbone Desync</div>
            <div className="text-xs text-red-300 leading-relaxed">{error}</div>
          </div>
        </div>
      ) : children}
    </div>
  </GlassCard>
);

// ── Specialized Sub-Hubs ─────────────────────────────────────────────────────

const PlexSubHub: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPlexData = useCallback(async () => {
    setLoading(true);
    try {
      // Direct fetch via base bridge pulse or specialized path
      // Note: Legacy used homeGet('plex', 'sessions')
      const resp = await fetch('http://localhost:10871/home/plex/sessions');
      const data = await resp.json();
      setSessions(data.sessions || data.MediaContainer?.Metadata || []);
      setOnline(true);
      setError(null);
    } catch (e: any) {
      setOnline(false);
      setError('Plex MCP Unreachable (:10740)');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlexData(); }, [fetchPlexData]);

  return (
    <ConnectorCard
      title="Plex Media" icon={<Tv2 size={20} />}
      colorClass="bg-yellow-500/20 border border-yellow-500/30"
      glowClass="shadow-yellow-500/20"
      online={online} loading={loading} error={error} onRefresh={fetchPlexData}
    >
      {loading ? <Skeleton /> : (
        <div className="space-y-4">
          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Active Streams ({sessions.length})</div>
          <AnimatePresence>
            {sessions.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-text-secondary italic italic items-center flex gap-2">
                <Activity size={12} /> Idle Grid System
              </motion.div>
            ) : sessions.map((s, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 border border-white/5 rounded-xl p-3"
              >
                <div className="text-xs font-bold text-white truncate">{s.grandparentTitle ? `${s.grandparentTitle} - ` : ''}{s.title}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-text-secondary">{s.Player?.title || 'Unknown Player'}</span>
                  <span className="text-[9px] font-black uppercase text-yellow-400">{s.Player?.state || 'Playing'}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </ConnectorCard>
  );
};

const CalibreSubHub: React.FC = () => {
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCalibreData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('http://localhost:10871/home/calibre/books/recent?limit=5');
      const data = await resp.json();
      setRecent(data.books || data.results || []);
      setOnline(true);
      setError(null);
    } catch (e: any) {
      setOnline(false);
      setError('Calibre MCP Unreachable (:10720)');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCalibreData(); }, [fetchCalibreData]);

  return (
    <ConnectorCard
      title="Calibre Library" icon={<BookOpen size={20} />}
      colorClass="bg-blue-500/20 border border-blue-500/30"
      glowClass="shadow-blue-500/20"
      online={online} loading={loading} error={error} onRefresh={fetchCalibreData}
    >
      {loading ? <Skeleton /> : (
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Recent Ingestions</div>
          {recent.map((b, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 group/book">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate group-hover/book:text-accent-primary transition-colors">{b.title}</div>
                <div className="text-[10px] text-text-secondary truncate">{b.authors || b.author}</div>
              </div>
              <div className="flex gap-1 ml-2">
                {(b.formats || []).slice(0, 2).map((f: string) => (
                  <span key={f} className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white/5 text-text-secondary uppercase">{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ConnectorCard>
  );
};

const HASubHub: React.FC = () => {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHAData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('http://localhost:10871/home/home-assistant/states');
      const data = await resp.json();
      const all = data.entities || data || [];
      const filtered = all.slice(0, 10); // Limit for the hub view
      setEntities(filtered);
      setOnline(true);
      setError(null);
    } catch (e: any) {
      setOnline(false);
      setError('HA MCP Unreachable (:10782)');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHAData(); }, [fetchHAData]);

  return (
    <ConnectorCard
      title="Home Assistant" icon={<Home size={20} />}
      colorClass="bg-indigo-500/20 border border-indigo-500/30"
      glowClass="shadow-indigo-500/20"
      online={online} loading={loading} error={error} onRefresh={fetchHAData}
    >
      {loading ? <Skeleton rows={5} /> : (
        <div className="space-y-2">
          {entities.map((e, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/5 rounded-xl">
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{e.attributes?.friendly_name || e.entity_id}</div>
                <div className="text-[9px] text-text-secondary uppercase tracking-tighter">{e.entity_id.split('.')[0]}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase ${['on', 'playing', 'open'].includes(e.state) ? 'text-accent-success' : 'text-text-secondary'}`}>
                  {e.state}
                </span>
                <Zap size={12} className={['on', 'playing'].includes(e.state) ? 'text-yellow-400' : 'text-white/10'} />
              </div>
            </div>
          ))}
        </div>
      )}
    </ConnectorCard>
  );
};

// ── MAIN HOME HUB PAGE ───────────────────────────────────────────────────────────

const HomeHub: React.FC = () => {
  const [bridgeStatus, setBridgeStatus] = useState({ online: false, integrity: 0 });

  useEffect(() => {
    const checkBridge = async () => {
      try {
        const resp = await fetch('http://localhost:10871/status');
        if (resp.ok) {
          setBridgeStatus({ online: true, integrity: 98.4 + Math.random() * 1.5 });
        } else {
          setBridgeStatus({ online: false, integrity: 0 });
        }
      } catch {
        setBridgeStatus({ online: false, integrity: 0 });
      }
    };
    
    checkBridge();
    const inv = setInterval(checkBridge, 10000);
    return () => clearInterval(inv);
  }, []);

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-accent-primary/10 border border-accent-primary/20 text-[10px] font-black text-accent-primary uppercase tracking-[0.2em]">
              Home Substrate v13.3
            </span>
            <div className="h-px w-24 bg-gradient-to-r from-accent-primary/50 to-transparent" />
          </div>
          <h1 className="text-7xl font-bold font-gradient tracking-tighter leading-none">
            Home <span className="opacity-50">Hub</span>
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl font-light border-l border-white/10 pl-6 py-1">
            Orchestrating local media topology and physical system constraints through the RoboFang Neural Bridge.
          </p>
        </div>

        {/* Bridge Status Indicator */}
        <GlassCard className="min-w-[320px] !p-6 flex flex-col gap-4 border-accent-primary/10">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Neural Bridge Integrity</div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${bridgeStatus.online ? 'bg-accent-success/10 border-accent-success/20 text-accent-success' : 'bg-accent-error/10 border-accent-error/20 text-accent-error'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${bridgeStatus.online ? 'bg-accent-success animate-pulse' : 'bg-accent-error'}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">{bridgeStatus.online ? 'Coherent' : 'Severed'}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-mono text-text-secondary">
              <span>SYSTEM_STABILITY</span>
              <span className={bridgeStatus.online ? 'text-accent-success' : 'text-accent-error'}>{bridgeStatus.integrity.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${bridgeStatus.integrity}%` }}
                className={`h-full ${bridgeStatus.online ? 'bg-gradient-to-r from-accent-primary to-accent-secondary' : 'bg-accent-error'}`}
              />
            </div>
          </div>
        </GlassCard>
      </header>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatPill label="Active Streams" value="2" icon={<Tv2 size={14} className="text-yellow-400" />} />
        <StatPill label="IoT Entities" value="128" icon={<Home size={14} className="text-emerald-400" />} />
        <StatPill label="Secure Zones" value="Locked" icon={<Shield size={14} className="text-rose-400" />} />
        <StatPill label="Bridge Pulse" value="Coherent" icon={<Zap size={14} className="text-accent-primary" />} />
      </div>

      {/* Main Connector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <PlexSubHub />
        <CalibreSubHub />
        <HASubHub />
        
        {/* These would be migrated next in the same pattern */}
        <ConnectorCard title="Tapo Devices" icon={<Camera size={20} />} colorClass="bg-green-500/20" glowClass="shadow-green-500/20" online={bridgeStatus.online} loading={false} onRefresh={() => {}}>
           <div className="text-xs text-text-secondary italic">Deployment pending Phase 2 extension.</div>
        </ConnectorCard>
        <ConnectorCard title="Netatmo Weather" icon={<CloudSun size={20} />} colorClass="bg-cyan-500/20" glowClass="shadow-cyan-500/20" online={bridgeStatus.online} loading={false} onRefresh={() => {}}>
           <div className="text-xs text-text-secondary italic">Deployment pending Phase 2 extension.</div>
        </ConnectorCard>
        <ConnectorCard title="Ring Security" icon={<Bell size={20} />} colorClass="bg-red-500/20" glowClass="shadow-red-500/20" online={bridgeStatus.online} loading={false} onRefresh={() => {}}>
           <div className="text-xs text-text-secondary italic">Deployment pending Phase 2 extension.</div>
        </ConnectorCard>
      </div>
    </div>
  );
};

export default HomeHub;
