import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  Box,
  Video,
  Music,
  Zap,
  Headphones,
  RefreshCw,
  Play,
  Circle,
  Layers,
  Film,
  Monitor,
  AlertCircle,
  Palette,
  Activity,
  Waves
} from "lucide-react";
import GlassCard from "../components/ui/GlassCard";

// ── Shared Constants ──────────────────────────────────────────────────────────
const BRIDGE = "http://localhost:10871";

// ── Helper Operations ─────────────────────────────────────────────────────────
async function creativeGet(connector: string, path: string) {
  const r = await axios.get(`${BRIDGE}/home/${connector}/${path}`, { timeout: 10000 });
  return r.data;
}

async function creativePost(connector: string, path: string, body: unknown = {}) {
  const r = await axios.post(`${BRIDGE}/home/${connector}/${path}`, body, { timeout: 10000 });
  return r.data;
}

async function launchConnector(connector: string) {
  try {
    await axios.post(`${BRIDGE}/api/connector/launch/${connector}`);
    return true;
  } catch (e) {
    console.error("Launch failed:", e);
    return false;
  }
}

// ── Connector Card Shell ──────────────────────────────────────────────────────
interface ConnectorCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  online: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  children: React.ReactNode;
  port: number;
  accentClass: string;
}

function ConnectorCard({
  title, subtitle, icon, online, loading, error, onRefresh, children, port, accentClass
}: ConnectorCardProps) {
  return (
    <GlassCard className={`flex flex-col h-full bg-slate-900/40 border-slate-700/50 hover:border-${accentClass}-500/30 transition-all duration-500 group overflow-hidden min-h-[460px]`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-${accentClass}-500/5`}>
        <div className={`text-${accentClass}-400 group-hover:scale-110 transition-transform duration-500`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-100">{title}</div>
          {subtitle && (
            <div className="text-[10px] text-slate-400 truncate uppercase tracking-widest mt-0.5 font-medium">
              {subtitle}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!online && !loading && (
             <button
                onClick={() => launchConnector(title.toLowerCase().replace(" ", "-"))}
                className={`px-2 py-0.5 rounded-lg bg-${accentClass}-500/10 hover:bg-${accentClass}-500/20 text-[9px] font-bold text-${accentClass}-400 border border-${accentClass}-500/20 transition-all uppercase tracking-tighter`}
              >
                Launch
              </button>
          )}
          <div 
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider transition-all duration-300 ${
              online 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            <div className={`w-1 h-1 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            {online ? "online" : `OFFLINE :${port}`}
          </div>
          
          <button
            onClick={onRefresh}
            title="Refresh Creative Library"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-200 transition-all active:scale-90"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : 'hover:rotate-180 transition-transform duration-500'} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading ? (
             <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div 
                        key={i} 
                        className="skeleton-bar" 
                        style={{ "--w": `${65 + (i % 4) * 8}%` } as React.CSSProperties} 
                    />
                ))}
            </div>
          ) : error ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center p-4 space-y-3"
            >
              <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle size={24} />
              </div>
              <div className="text-[10px] text-slate-500 leading-relaxed max-w-[200px]">{error}</div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}

// ── Blender Card ──────────────────────────────────────────────────────────────
function BlenderCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scene, setScene] = useState<{name?: string, objects?: number, render_engine?: string} | null>(null);
  const [objects, setObjects] = useState<string[]>([]);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const si = await creativeGet("blender", "scene/info");
      const ob = await creativeGet("blender", "scene/objects");
      setScene(si?.scene || si);
      setObjects(Array.isArray(ob?.objects) ? ob.objects.slice(0, 30) : []);
      setOnline(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <ConnectorCard
      title="Blender" subtitle={scene?.name || "3D Workspace"} icon={<Box size={18} />} accentClass="orange"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10849}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/40 rounded-lg p-2 border border-white/5">
                <div className="text-[9px] text-slate-500 uppercase tracking-tighter mb-0.5">Objects</div>
                <div className="text-sm font-bold text-slate-200 font-mono">{scene?.objects ?? objects.length}</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-2 border border-white/5">
                <div className="text-[9px] text-slate-500 uppercase tracking-tighter mb-0.5">Engine</div>
                <div className="text-[10px] font-bold text-orange-400/80 uppercase font-mono">{scene?.render_engine || "Cycles"}</div>
            </div>
        </div>

        <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
            {objects.map((obj, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] transition-all">
                    <Layers size={10} className="text-orange-500/50" />
                    <span className="text-[11px] text-slate-300 truncate uppercase tracking-tight">{obj}</span>
                </div>
            ))}
            {objects.length === 0 && <div className="text-center py-10 text-[10px] text-slate-700 italic">No scene graph found.</div>}
        </div>

        <button
            onClick={async () => {
                setRenderStatus("rendering...");
                try { await creativePost("blender", "render/frame"); setRenderStatus("success ✓"); }
                catch { setRenderStatus("failed"); }
                setTimeout(() => setRenderStatus(null), 3000);
            }}
            className="w-full py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
        >
            <Play size={12} fill="currentColor" /> Render Frame
        </button>
        {renderStatus && <div className="text-[10px] text-center text-orange-500 animate-pulse">{renderStatus}</div>}
      </div>
    </ConnectorCard>
  );
}

// ── OBS Studio Card ───────────────────────────────────────────────────────────
function OBSCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{scene_name?: string, streaming?: boolean, recording?: boolean} | null>(null);
  const [scenes, setScenes] = useState<{name: string}[]>([]);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const st = await creativeGet("obs", "status");
      const sc = await creativeGet("obs", "scenes");
      setStatus(st);
      setScenes(Array.isArray(sc?.scenes) ? sc.scenes : []);
      setOnline(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <ConnectorCard
      title="OBS Studio" subtitle={status?.scene_name || "Encoder"} icon={<Video size={18} />} accentClass="red"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10819}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-xl p-2 border flex items-center justify-between ${status?.streaming ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/40 border-white/5'}`}>
                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Stream</div>
                <div className={`w-2 h-2 rounded-full ${status?.streaming ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
            </div>
            <div className={`rounded-xl p-2 border flex items-center justify-between ${status?.recording ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-800/40 border-white/5'}`}>
                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Record</div>
                <div className={`w-2 h-2 rounded-full ${status?.recording ? 'bg-rose-500 animate-pulse' : 'bg-slate-700'}`} />
            </div>
        </div>

        <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest px-1">Scene Registry</div>
            {scenes.map(s => (
                <button
                    key={s.name}
                    onClick={() => creativePost("obs", "scenes/switch", { scene: s.name }).then(fetch)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl border transition-all ${
                        s.name === status?.scene_name 
                            ? "bg-red-500/10 border-red-500/30 text-red-200" 
                            : "bg-white/[0.02] border-white/[0.04] hover:border-red-500/20 text-slate-400"
                    }`}
                >
                    <Monitor size={12} className={s.name === status?.scene_name ? "text-red-400" : "text-slate-600"} />
                    <span className="text-[11px] font-bold uppercase tracking-tight truncate">{s.name}</span>
                    {s.name === status?.scene_name && <Waves size={10} className="ml-auto animate-bounce" />}
                </button>
            ))}
        </div>

        <div className="flex gap-2">
            <button className="flex-1 py-1.5 rounded-xl bg-slate-800/40 border border-white/5 text-[10px] font-bold uppercase text-slate-400 hover:bg-white/5 transition-all">Start Stream</button>
            <button className="flex-1 py-1.5 rounded-xl bg-slate-800/40 border border-white/5 text-[10px] font-bold uppercase text-slate-400 hover:bg-white/5 transition-all">Start Record</button>
        </div>
      </div>
    </ConnectorCard>
  );
}

// ── DaVinci Resolve Card ──────────────────────────────────────────────────────
function DaVinciCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<{name?: string, fps?: number} | null>(null);
  const [timelines, setTimelines] = useState<{name: string, duration?: string}[]>([]);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const pr = await creativeGet("davinci-resolve", "project/info");
      const tl = await creativeGet("davinci-resolve", "timelines");
      setProject(pr?.project || pr);
      setTimelines(Array.isArray(tl?.timelines) ? tl.timelines : []);
      setOnline(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <ConnectorCard
      title="DaVinci" subtitle={project?.name || "Suite"} icon={<Film size={18} />} accentClass="amber"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10843}
    >
      <div className="space-y-4">
        <div className="bg-slate-800/40 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] text-slate-500 uppercase tracking-tighter">Active project</div>
                <div className="text-[9px] text-amber-500 font-bold uppercase">{project?.fps || "24"} FPS</div>
            </div>
            <div className="text-sm font-black text-slate-200 uppercase tracking-tight truncate">{project?.name || "UNTITLED_GRIP"}</div>
        </div>

        <div className="space-y-1.5">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest px-1">Timelines</div>
            <div className="space-y-1 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                {timelines.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.03] hover:border-amber-500/20 transition-all group/tl">
                        <Activity size={10} className="text-amber-500/50 group-hover/tl:text-amber-500 transition-colors" />
                        <span className="text-[11px] text-slate-300 truncate uppercase tracking-tight">{t.name}</span>
                        <span className="ml-auto text-[9px] text-slate-600 font-mono">{t.duration || "—"}</span>
                    </div>
                ))}
                {timelines.length === 0 && <div className="text-center py-6 text-[10px] text-slate-700 italic">No timeline handles.</div>}
            </div>
        </div>

        <button className="w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] font-bold uppercase tracking-widest transition-all">
            Quick Export Render
        </button>
      </div>
    </ConnectorCard>
  );
}

// ── Reaper Card ───────────────────────────────────────────────────────────────
function ReaperCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{tempo?: string, playing?: boolean, recording?: boolean, position?: string} | null>(null);
  const [tracks, setTracks] = useState<{name?: string, muted?: boolean, solo?: boolean}[]>([]);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const st = await creativeGet("reaper", "transport/status");
      const tr = await creativeGet("reaper", "tracks");
      setStatus(st);
      setTracks(Array.isArray(tr?.tracks) ? tr.tracks.slice(0, 16) : []);
      setOnline(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <ConnectorCard
      title="Reaper" subtitle="Digital Audio Workstation" icon={<Music size={18} />} accentClass="emerald"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10797}
    >
        <div className="space-y-4">
            <div className="bg-slate-800/40 rounded-xl p-3 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                    <div className="text-[9px] text-slate-500 uppercase tracking-tighter">BPM / Tempo</div>
                    <div className="text-[10px] text-emerald-400 font-mono font-bold">{status?.tempo || "120.00"}</div>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`p-1.5 rounded-lg border transition-all ${status?.playing ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-900 border-white/5'}`}>
                        <Play size={14} className={status?.playing ? 'text-emerald-400 fill-emerald-400' : 'text-slate-700'} />
                    </div>
                    <div className={`p-1.5 rounded-lg border transition-all ${status?.recording ? 'bg-red-500/20 border-red-500/30' : 'bg-slate-900 border-white/5'}`}>
                        <Circle size={14} className={status?.recording ? 'text-red-400 fill-red-400' : 'text-slate-700'} />
                    </div>
                    <div className="flex-1 text-right text-[10px] font-mono text-slate-600 tracking-tighter">
                        {status?.position || "0:00:000"}
                    </div>
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-widest px-1">Track List ({tracks.length})</div>
                <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                    {tracks.map((t, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.03] hover:border-emerald-500/20 transition-all group/track">
                            <Headphones size={10} className="text-emerald-500/50 group-hover/track:text-emerald-400 transition-colors" />
                            <span className="text-[11px] text-slate-300 truncate uppercase tracking-tight">{t.name || `Track ${i+1}`}</span>
                            <div className="ml-auto flex gap-1">
                                {t.muted && <span className="w-1.5 h-1.5 rounded-full bg-red-500/40" />}
                                {t.solo && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/40" />}
                            </div>
                        </div>
                    ))}
                    {tracks.length === 0 && <div className="text-center py-6 text-[10px] text-slate-700 italic">No active bus.</div>}
                </div>
            </div>
        </div>
    </ConnectorCard>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function CreativeHub() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Palette size={20} />
            </div>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">CreativeHub</h1>
          </div>
          <p className="text-slate-400 text-sm max-w-xl font-medium">
             Wave 2 Production Grid. High-fidelity automation for 3D modeling, broadcast encoding, video synthesis, and digital audio workflows.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex gap-2"
        >
          {["Production", "Active", "4K Ready"].map(tag => (
            <span key={tag} className="px-3 py-1 rounded-lg bg-slate-800/40 border border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              {tag}
            </span>
          ))}
        </motion.div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        <BlenderCard />
        <OBSCard />
        <DaVinciCard />
        <ReaperCard />
        
        {/* Placeholder / Coming Soon */}
        <div className="h-full min-h-[460px] p-8 rounded-3xl bg-slate-900/40 border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-center group hover:border-violet-500/20 transition-all duration-700">
            <Zap size={32} className="text-slate-800 mb-4 group-hover:text-violet-500/40 transition-all duration-700" />
            <div className="text-xs font-bold text-slate-700 uppercase tracking-[0.3em] mb-2">Resolume Arena</div>
            <div className="text-[10px] text-slate-800 uppercase tracking-tighter italic">Shader pipeline integration pending...</div>
        </div>

        <GlassCard className="flex flex-col items-center justify-center h-full min-h-[460px] bg-violet-600/5 border-dashed border-violet-500/20 text-violet-500/30 group hover:border-violet-500/40 transition-all duration-1000">
          <Layers size={32} className="opacity-20 mb-4 group-hover:rotate-12 transition-transform duration-700" />
          <div className="text-xs font-bold uppercase tracking-[0.2em]">Cortex expansion</div>
          <div className="text-[10px] mt-1 italic tracking-tighter">Unified production registry scaling...</div>
        </GlassCard>
      </div>
    </div>
  );
}
