/**
 * CreativeHub — Wave 2 Creative Tools
 * Connectors: blender, obs, davinci-resolve, reaper, resolume, vrchat
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  Box,
  Video,
  Music,
  Zap,
  Headphones,
  Globe,
  RefreshCw,
  Play,
  Square,
  Circle,
  Layers,
  Film,
  Mic,
  Monitor,
  ChevronRight,
  AlertCircle,
  Palette,
} from "lucide-react";

const BRIDGE = "http://localhost:10871";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function creativeGet(connector: string, path: string) {
  const r = await axios.get(`${BRIDGE}/home/${connector}/${path}`, { timeout: 8000 });
  return r.data;
}

async function creativePost(connector: string, path: string, body: unknown = {}) {
  const r = await axios.post(`${BRIDGE}/home/${connector}/${path}`, body, { timeout: 8000 });
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

// ---------------------------------------------------------------------------
// Shared card shell
// ---------------------------------------------------------------------------

interface CardShellProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor: string; // tailwind class prefix like "purple"
  online: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  children: React.ReactNode;
  port: number;
}

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-white/5 rounded" style={{ width: `${70 + (i % 3) * 10}%` } as any} />
      ))}
    </div>
  );
}

// Static accent class map — Tailwind cannot generate dynamic class strings at build/scan time
const ACCENT: Record<string, { border: string; bg: string; shadow: string }> = {
  orange: { border: "border-orange-500/30", bg: "bg-orange-500/10", shadow: "shadow-orange-500/10" },
  red: { border: "border-red-500/30", bg: "bg-red-500/10", shadow: "shadow-red-500/10" },
  amber: { border: "border-amber-500/30", bg: "bg-amber-500/10", shadow: "shadow-amber-500/10" },
  green: { border: "border-green-500/30", bg: "bg-green-500/10", shadow: "shadow-green-500/10" },
  violet: { border: "border-violet-500/30", bg: "bg-violet-500/10", shadow: "shadow-violet-500/10" },
  blue: { border: "border-blue-500/30", bg: "bg-blue-500/10", shadow: "shadow-blue-500/10" },
  indigo: { border: "border-indigo-500/30", bg: "bg-indigo-500/10", shadow: "shadow-indigo-500/10" },
};

function ConnectorCard({
  title, subtitle, icon, accentColor, online, loading, error, onRefresh, children, port,
}: CardShellProps) {
  const ac = ACCENT[accentColor] ?? ACCENT.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex flex-col rounded-2xl border bg-white/[0.03] backdrop-blur-md shadow-lg overflow-hidden group hover:border-white/20 transition-all duration-500 ${ac.border} ${ac.shadow}`}
      style={{ minHeight: '420px' } as any}
    >
      {/* Header */}
      <div className={`flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-white/[0.02] ${ac.bg}`}>
        <div className="text-white/70 transition-transform group-hover:scale-110 duration-500">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-100">{title}</div>
          {subtitle && <div className="text-[10px] text-slate-400 truncate uppercase tracking-widest mt-0.5">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${online ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : "bg-red-500/20 text-red-400 border border-red-500/20"}`}
            >
              {online ? "online" : `offline :${port}`}
            </span>
            {!online && (
              <button
                onClick={() => launchConnector(title.toLowerCase().replace(" ", "-"))}
                className="px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[9px] font-bold text-indigo-400 border border-indigo-500/20 transition-all uppercase tracking-tighter"
              >
                Launch
              </button>
            )}
          </div>
          <button
            onClick={onRefresh}
            title="Refresh creative tool data"
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-100 transition-all active:scale-90"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar text-sm">
        {loading ? (
          <Skeleton />
        ) : error ? (
          <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// BlenderCard
// ---------------------------------------------------------------------------

interface BlenderScene {
  name: string;
  objects: number;
  render_engine?: string;
}

function BlenderCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scene, setScene] = useState<BlenderScene | null>(null);
  const [objects, setObjects] = useState<string[]>([]);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [si, ob] = await Promise.allSettled([
        creativeGet("blender", "scene/info"),
        creativeGet("blender", "scene/objects"),
      ]);
      if (si.status === "fulfilled") {
        setScene(si.value?.scene || si.value);
        setOnline(true);
      }
      if (ob.status === "fulfilled") {
        const raw = ob.value;
        setObjects(Array.isArray(raw?.objects) ? raw.objects.slice(0, 20) : []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const renderFrame = async () => {
    setRenderStatus("rendering…");
    try {
      await creativePost("blender", "render/frame", {});
      setRenderStatus("render queued ✓");
    } catch { setRenderStatus("render failed"); }
    setTimeout(() => setRenderStatus(null), 4000);
  };

  return (
    <ConnectorCard
      title="Blender" subtitle={scene?.name || "No scene"} icon={<Box size={18} />}
      accentColor="orange" online={online} loading={loading} error={error} onRefresh={fetch} port={10849}
    >
      {scene && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Objects</div>
            <div className="text-slate-100 font-semibold">{scene.objects ?? objects.length}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Engine</div>
            <div className="text-slate-100 font-semibold text-xs">{scene.render_engine || "CYCLES"}</div>
          </div>
        </div>
      )}
      <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
        {objects.map((obj) => (
          <div key={obj} className="flex items-center gap-2 px-2 py-1 rounded bg-white/[0.03] hover:bg-white/[0.07]">
            <Layers size={11} className="text-orange-400" />
            <span className="text-slate-300 text-xs truncate">{obj}</span>
          </div>
        ))}
      </div>
      <button
        onClick={renderFrame}
        className="w-full py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-medium transition-colors flex items-center justify-center gap-2"
      >
        <Play size={12} /> Render Frame
      </button>
      {renderStatus && <div className="mt-2 text-xs text-orange-300 text-center">{renderStatus}</div>}
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// OBSCard
// ---------------------------------------------------------------------------

interface OBSScene { name: string; }
interface OBSStatus { streaming: boolean; recording: boolean; scene_name?: string; fps?: number; }

function OBSCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OBSStatus | null>(null);
  const [scenes, setScenes] = useState<OBSScene[]>([]);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [st, sc] = await Promise.allSettled([
        creativeGet("obs", "status"),
        creativeGet("obs", "scenes"),
      ]);
      if (st.status === "fulfilled") { setStatus(st.value); setOnline(true); }
      if (sc.status === "fulfilled") {
        const raw = sc.value;
        setScenes(Array.isArray(raw?.scenes) ? raw.scenes : []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const action = async (endpoint: string, label: string) => {
    setActionMsg(`${label}…`);
    try {
      await creativePost("obs", endpoint, {});
      setActionMsg(`${label} ✓`);
      setTimeout(fetch, 1000);
    } catch { setActionMsg(`${label} failed`); }
    setTimeout(() => setActionMsg(null), 4000);
  };

  const switchScene = async (name: string) => {
    await creativePost("obs", "scenes/switch", { scene: name });
    fetch();
  };

  return (
    <ConnectorCard
      title="OBS Studio" subtitle={status?.scene_name || "Streaming / Recording"} icon={<Video size={18} />}
      accentColor="red" online={online} loading={loading} error={error} onRefresh={fetch} port={10819}
    >
      {status && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className={`rounded-lg p-2 ${status.streaming ? "bg-red-500/20" : "bg-white/5"}`}>
            <div className="text-slate-400 text-xs">Stream</div>
            <div className={`font-semibold text-xs ${status.streaming ? "text-red-400" : "text-slate-400"}`}>
              {status.streaming ? "LIVE" : "off"}
            </div>
          </div>
          <div className={`rounded-lg p-2 ${status.recording ? "bg-rose-500/20" : "bg-white/5"}`}>
            <div className="text-slate-400 text-xs">Record</div>
            <div className={`font-semibold text-xs ${status.recording ? "text-rose-400" : "text-slate-400"}`}>
              {status.recording ? "REC" : "off"}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">FPS</div>
            <div className="text-slate-100 font-semibold text-xs">{status.fps ?? "—"}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <button onClick={() => action(status?.streaming ? "streaming/stop" : "streaming/start", status?.streaming ? "Stop stream" : "Start stream")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${status?.streaming ? "bg-red-500/30 hover:bg-red-500/40 text-red-300" : "bg-white/10 hover:bg-white/15 text-slate-300"}`}
        >
          {status?.streaming ? <Square size={11} /> : <Circle size={11} />}
          {status?.streaming ? "Stop" : "Stream"}
        </button>
        <button onClick={() => action(status?.recording ? "recording/stop" : "recording/start", status?.recording ? "Stop rec" : "Start rec")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${status?.recording ? "bg-rose-500/30 hover:bg-rose-500/40 text-rose-300" : "bg-white/10 hover:bg-white/15 text-slate-300"}`}
        >
          <Mic size={11} />
          {status?.recording ? "Stop Rec" : "Record"}
        </button>
      </div>

      <div className="space-y-1 max-h-44 overflow-y-auto">
        <div className="text-slate-500 text-xs mb-1">Scenes</div>
        {scenes.map((s) => (
          <button key={s.name} onClick={() => switchScene(s.name)}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-left transition-colors ${s.name === status?.scene_name ? "bg-red-500/20 text-red-300" : "bg-white/[0.03] hover:bg-white/[0.07] text-slate-300"}`}
          >
            <Monitor size={11} className="shrink-0" />
            <span className="truncate">{s.name}</span>
            {s.name === status?.scene_name && <span className="ml-auto text-red-400 text-xs">active</span>}
          </button>
        ))}
      </div>
      {actionMsg && <div className="mt-2 text-xs text-red-300 text-center">{actionMsg}</div>}
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// DaVinciCard
// ---------------------------------------------------------------------------

interface DVProject { name: string; fps?: number; resolution?: string; }
interface DVTimeline { name: string; duration?: string; clips?: number; }

function DaVinciCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<DVProject | null>(null);
  const [timelines, setTimelines] = useState<DVTimeline[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [pr, tl] = await Promise.allSettled([
        creativeGet("davinci-resolve", "project/info"),
        creativeGet("davinci-resolve", "timelines"),
      ]);
      if (pr.status === "fulfilled") { setProject(pr.value?.project || pr.value); setOnline(true); }
      if (tl.status === "fulfilled") {
        const raw = tl.value;
        setTimelines(Array.isArray(raw?.timelines) ? raw.timelines : []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const exportTimeline = async () => {
    setMsg("exporting…");
    try {
      await creativePost("davinci-resolve", "export/current", {});
      setMsg("export started ✓");
    } catch { setMsg("export failed"); }
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <ConnectorCard
      title="DaVinci Resolve" subtitle={project?.name || "Video Editor"} icon={<Film size={18} />}
      accentColor="amber" online={online} loading={loading} error={error} onRefresh={fetch} port={10843}
    >
      {project && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">FPS</div>
            <div className="text-slate-100 font-semibold">{project.fps ?? "24"}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Resolution</div>
            <div className="text-slate-100 font-semibold text-xs">{project.resolution || "1920×1080"}</div>
          </div>
        </div>
      )}

      <div className="space-y-1 mb-3 max-h-44 overflow-y-auto">
        <div className="text-slate-500 text-xs mb-1">Timelines</div>
        {timelines.length === 0 && <div className="text-slate-500 text-xs">No timelines found</div>}
        {timelines.map((t, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-white/[0.03]">
            <ChevronRight size={11} className="text-amber-400" />
            <span className="text-slate-300 text-xs truncate">{t.name}</span>
            {t.clips != null && <span className="ml-auto text-slate-500 text-xs">{t.clips} clips</span>}
          </div>
        ))}
      </div>

      <button onClick={exportTimeline}
        className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors flex items-center justify-center gap-2"
      >
        <Play size={12} /> Export Current Timeline
      </button>
      {msg && <div className="mt-2 text-xs text-amber-300 text-center">{msg}</div>}
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// ReaperCard
// ---------------------------------------------------------------------------

interface ReaperStatus {
  playing: boolean;
  recording: boolean;
  tempo?: number;
  position?: string;
}
interface ReaperTrack { name: string; muted: boolean; solo: boolean; }

function ReaperCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ReaperStatus | null>(null);
  const [tracks, setTracks] = useState<ReaperTrack[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [st, tr] = await Promise.allSettled([
        creativeGet("reaper", "transport/status"),
        creativeGet("reaper", "tracks"),
      ]);
      if (st.status === "fulfilled") { setStatus(st.value); setOnline(true); }
      if (tr.status === "fulfilled") {
        const raw = tr.value;
        setTracks(Array.isArray(raw?.tracks) ? raw.tracks.slice(0, 12) : []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const transport = async (action: string) => {
    setMsg(`${action}…`);
    try {
      await creativePost("reaper", `transport/${action}`, {});
      setMsg(`${action} ✓`);
      setTimeout(fetch, 800);
    } catch { setMsg(`${action} failed`); }
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <ConnectorCard
      title="Reaper" subtitle="Audio Production" icon={<Music size={18} />}
      accentColor="green" online={online} loading={loading} error={error} onRefresh={fetch} port={10797}
    >
      {status && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className={`rounded-lg p-2 ${status.playing ? "bg-green-500/20" : "bg-white/5"}`}>
            <div className="text-slate-400 text-xs">Play</div>
            <div className={`font-semibold text-xs ${status.playing ? "text-green-400" : "text-slate-500"}`}>
              {status.playing ? "PLAYING" : "stopped"}
            </div>
          </div>
          <div className={`rounded-lg p-2 ${status.recording ? "bg-red-500/20" : "bg-white/5"}`}>
            <div className="text-slate-400 text-xs">Record</div>
            <div className={`font-semibold text-xs ${status.recording ? "text-red-400" : "text-slate-500"}`}>
              {status.recording ? "REC" : "off"}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">BPM</div>
            <div className="text-slate-100 font-semibold text-xs">{status.tempo ?? "—"}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        {["play", "pause", "stop", "record"].map((a) => (
          <button key={a} onClick={() => transport(a)}
            className="flex-1 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-slate-300 text-xs font-medium transition-colors capitalize"
          >
            {a}
          </button>
        ))}
      </div>

      <div className="space-y-1 max-h-40 overflow-y-auto">
        <div className="text-slate-500 text-xs mb-1">Tracks ({tracks.length})</div>
        {tracks.map((t, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-white/[0.03]">
            <Headphones size={11} className="text-green-400 shrink-0" />
            <span className="text-slate-300 text-xs truncate flex-1">{t.name}</span>
            {t.muted && <span className="text-xs text-slate-600">M</span>}
            {t.solo && <span className="text-xs text-yellow-400">S</span>}
          </div>
        ))}
      </div>
      {msg && <div className="mt-2 text-xs text-green-300 text-center">{msg}</div>}
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// ResolumeCard
// ---------------------------------------------------------------------------

interface ResolumeComposition {
  name?: string;
  bpm?: number;
  columns?: number;
  layers?: number;
}
interface ResolumeClip { name: string; col: number; row: number; connected: boolean; }

function ResolumeCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comp, setComp] = useState<ResolumeComposition | null>(null);
  const [clips, setClips] = useState<ResolumeClip[]>([]);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ci, cl] = await Promise.allSettled([
        creativeGet("resolume", "composition"),
        creativeGet("resolume", "composition/clips"),
      ]);
      if (ci.status === "fulfilled") { setComp(ci.value?.composition || ci.value); setOnline(true); }
      if (cl.status === "fulfilled") {
        const raw = cl.value;
        setClips(Array.isArray(raw?.clips) ? raw.clips.slice(0, 16) : []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const triggerClip = async (col: number, row: number) => {
    try { await creativePost("resolume", `composition/clips/${col}/${row}/trigger`, {}); }
    catch { /* silent */ }
  };

  return (
    <ConnectorCard
      title="Resolume" subtitle={comp?.name || "Live VJ Visuals"} icon={<Zap size={18} />}
      accentColor="violet" online={online} loading={loading} error={error} onRefresh={fetch} port={10770}
    >
      {comp && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">BPM</div>
            <div className="text-slate-100 font-semibold">{comp.bpm ?? "—"}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Layers</div>
            <div className="text-slate-100 font-semibold">{comp.layers ?? "—"}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Columns</div>
            <div className="text-slate-100 font-semibold">{comp.columns ?? "—"}</div>
          </div>
        </div>
      )}

      {clips.length > 0 && (
        <div>
          <div className="text-slate-500 text-xs mb-2">Clips (click to trigger)</div>
          <div className="grid grid-cols-4 gap-1">
            {clips.map((c, i) => (
              <button key={i} onClick={() => triggerClip(c.col, c.row)}
                className={`rounded p-1.5 text-xs truncate transition-colors ${c.connected ? "bg-violet-500/30 hover:bg-violet-500/50 text-violet-300" : "bg-white/5 hover:bg-white/10 text-slate-500"}`}
                title={c.name}
              >
                {c.name.slice(0, 6) || `${c.col}/${c.row}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {clips.length === 0 && online && (
        <div className="text-slate-500 text-xs">No clips in composition</div>
      )}
    </ConnectorCard>
  );
}

// Slot migrated to Virtual Hub

// ---------------------------------------------------------------------------
// Page status strip
// ---------------------------------------------------------------------------

const WAVE2_CONNECTORS = [
  { key: "blender", label: "Blender", port: 10849 },
  { key: "obs", label: "OBS", port: 10819 },
  { key: "davinci-resolve", label: "DaVinci", port: 10843 },
  { key: "reaper", label: "Reaper", port: 10797 },
  { key: "resolume", label: "Resolume", port: 10770 },
];

function StatusStrip() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    axios.get(`${BRIDGE}/home`).then((r) => {
      const connectors = r.data?.connectors || {};
      const result: Record<string, boolean> = {};
      for (const { key } of WAVE2_CONNECTORS) {
        result[key] = connectors[key]?.online ?? false;
      }
      setStatuses(result);
    }).catch(() => { });
  }, []);

  return (
    <div className="hidden md:flex items-center gap-2 flex-wrap">
      {WAVE2_CONNECTORS.map(({ key, label }) => (
        <span key={key}
          className={`text-xs px-2 py-0.5 rounded-full ${statuses[key] ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-slate-500"}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CreativeHub() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Palette size={22} className="text-violet-400" />
            <h1 className="text-xl font-bold text-slate-100">Creative Hub</h1>
          </div>
          <p className="text-sm text-slate-400">Wave 2 connectors — 3D, video, audio, live visuals, VR.</p>
        </div>
        <StatusStrip />
      </div>

      {/* 2×3 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        <BlenderCard />
        <OBSCard />
        <DaVinciCard />
        <ReaperCard />
        <ResolumeCard />

        {/* Slot moved to Virtual Hub */}
        <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-slate-700 text-xs gap-3">
          <Globe size={24} className="opacity-20" />
          <div className="text-center">
            <p>VRChat moved to</p>
            <p className="font-bold text-slate-600">Virtual Hub (Wave 5)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
