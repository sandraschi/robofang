import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  Server,
  Container,
  Activity,
  RefreshCw,
  AlertCircle,
  Layers,
  MonitorDot,
  ChevronRight
} from "lucide-react";
import GlassCard from "../components/ui/GlassCard";

// ── Shared Constants ──────────────────────────────────────────────────────────
const BRIDGE = "http://localhost:10871";

// ── Shared Helper Operations ──────────────────────────────────────────────────
async function infraGet(connector: string, path: string) {
  const r = await axios.get(`${BRIDGE}/home/${connector}/${path}`, { timeout: 10000 });
  return r.data;
}

// infraPost removed if unused

async function launchConnector(connector: string) {
  try {
    await axios.post(`${BRIDGE}/api/connector/launch/${connector}`);
    return true;
  } catch (e) {
    console.error("Launch failed:", e);
    return false;
  }
}

// ── Reusable Component: PctBar ────────────────────────────────────────────────
function PctBar({ value, color = "indigo" }: { value: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    sky: "bg-sky-500",
    violet: "bg-violet-500",
    teal: "bg-teal-500",
  };
  const bar = colorMap[color] ?? "bg-indigo-500";
  const dangerColor = pct > 85 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : bar;
  
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        className={`h-full rounded-full transition-all duration-700 ${dangerColor}`} 
      />
    </div>
  );
}

// ── Reusable Component: ConnectorCard ─────────────────────────────────────────
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
}

function ConnectorCard({
  title, subtitle, icon, online, loading, error, onRefresh, children, port,
}: ConnectorCardProps) {
  return (
    <GlassCard className="flex flex-col h-full bg-slate-900/40 border-slate-700/50 hover:border-indigo-500/30 transition-all duration-500 group overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-slate-800/20">
        <div className="text-slate-400 group-hover:text-indigo-400 transition-all duration-500 scale-110">
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
            title="Refresh Signal"
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
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-2 bg-slate-800 rounded w-1/3 animate-pulse" />
                  <div className="h-1.5 bg-slate-800/50 rounded w-full animate-pulse" />
                </div>
              ))}
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center p-4 space-y-3"
            >
              <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-red-400 capitalize mb-1">Connector Error</div>
                <div className="text-[10px] text-slate-500 leading-relaxed max-w-[200px]">{error}</div>
              </div>
              <button 
                onClick={() => launchConnector(title.toLowerCase().replace(" ", "-"))}
                className="mt-2 px-4 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30 transition-all"
              >
                Launch Connector
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info (Optional) */}
      {!online && !loading && !error && (
        <div className="px-5 py-3 bg-slate-800/10 border-t border-white/[0.03]">
          <button 
            onClick={() => launchConnector(title.toLowerCase().replace(" ", "-"))}
            className="w-full py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            Reconnect to Pipeline
          </button>
        </div>
      )}
    </GlassCard>
  );
}

// ── Specialized Hub Cards ─────────────────────────────────────────────────────

function VirtualizationCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vms, setVMs] = useState<{name: string, state: string, memory_mb?: number}[]>([]);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await infraGet("virtualization", "vms");
      setVMs(Array.isArray(data?.vms) ? data.vms : Array.isArray(data) ? data : []);
      setOnline(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const running = vms.filter(v => v.state === "running").length;

  return (
    <ConnectorCard
      title="Virtualization" subtitle={`VirtualBox — ${vms.length} Instances`}
      icon={<Server size={18} />} online={online} loading={loading} error={error} 
      onRefresh={fetch} port={10700}
    >
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-800/40 rounded-xl p-3 border border-white/5">
          <div className="text-[10px] text-slate-500 uppercase tracking-tighter mb-1">Active VMs</div>
          <div className="text-xl font-bold text-emerald-400 font-mono">{running}</div>
        </div>
        <div className="bg-slate-800/40 rounded-xl p-3 border border-white/5">
          <div className="text-[10px] text-slate-500 uppercase tracking-tighter mb-1">Halted</div>
          <div className="text-xl font-bold text-slate-400 font-mono">{vms.length - running}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        {vms.map(vm => (
          <div key={vm.name} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors group/item">
            <div className={`w-1.5 h-1.5 rounded-full ${vm.state === "running" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-slate-600"}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">{vm.name}</div>
              <div className="text-[10px] text-slate-500 font-mono tracking-tighter">
                {vm.state} {vm.memory_mb && `· ${Math.round(vm.memory_mb/1024)}GB`}
              </div>
            </div>
            <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
              <ChevronRight size={14} className="text-slate-600" />
            </div>
          </div>
        ))}
        {vms.length === 0 && <div className="text-center py-4 text-[10px] text-slate-600 italic">No virtual entities detected</div>}
      </div>
    </ConnectorCard>
  );
}

function DockerCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containers, setContainers] = useState<{id: string, name: string, state: string}[]>([]);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await infraGet("docker", "containers");
      setContainers(Array.isArray(data?.containers) ? data.containers : Array.isArray(data) ? data : []);
      setOnline(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const running = containers.filter(c => c.state === "running").length;

  return (
    <ConnectorCard
      title="Docker" subtitle="Container Runtime"
      icon={<Container size={18} />} online={online} loading={loading} error={error} 
      onRefresh={fetch} port={10807}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="text-xs font-bold text-slate-200">Container Fleet</div>
        <div className="text-[10px] text-slate-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
          {running} UP
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          {containers.slice(0, 5).map(c => (
            <div key={c.id} className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-300 font-medium truncate max-w-[140px]">{c.name.replace("/", "")}</span>
                <span className={`font-mono ${c.state === "running" ? "text-emerald-400" : "text-slate-500"}`}>
                  {c.state}
                </span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${c.state === "running" ? "bg-blue-500 w-full" : "bg-slate-700 w-0"}`} />
              </div>
            </div>
          ))}
          {containers.length > 5 && (
            <div className="text-[10px] text-slate-500 text-center pt-2">
              + {containers.length - 5} more containers
            </div>
          )}
        </div>
        
        <button className="w-full py-2 rounded-lg bg-slate-800/40 border border-white/5 hover:border-blue-500/30 text-slate-400 hover:text-blue-400 text-[10px] font-bold uppercase tracking-widest transition-all">
          Manage Infrastructure
        </button>
      </div>
    </ConnectorCard>
  );
}

function MonitoringCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<{
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
    gpu_percent?: number;
    gpu_temp_c?: number;
  } | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await infraGet("monitoring", "metrics/current");
      setMetrics(data?.metrics || data);
      setOnline(true);
    } catch {
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { 
    fetch(); 
    const t = setInterval(fetch, 10000); 
    return () => clearInterval(t); 
  }, [fetch]);

  return (
    <ConnectorCard
      title="System Monitor" subtitle="Goliath Node"
      icon={<Activity size={18} />} online={online} loading={loading} error={null} 
      onRefresh={fetch} port={10809}
    >
      {metrics && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                <span className="text-slate-500">CPU Load</span>
                <span className="text-indigo-400">{metrics.cpu_percent.toFixed(1)}%</span>
              </div>
              <PctBar value={metrics.cpu_percent} color="indigo" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                <span className="text-slate-500">Memory Usage</span>
                <span className="text-sky-400">{metrics.memory_percent.toFixed(1)}%</span>
              </div>
              <PctBar value={metrics.memory_percent} color="sky" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                <span className="text-slate-500">Disk I/O</span>
                <span className="text-teal-400">{metrics.disk_percent.toFixed(1)}%</span>
              </div>
              <PctBar value={metrics.disk_percent} color="teal" />
            </div>
          </div>

          {metrics.gpu_percent != null && (
            <div className="pt-3 border-t border-white/5 space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                  <span className="text-slate-500">RTX 4090 Core</span>
                  <span className="text-violet-400">{metrics.gpu_percent.toFixed(1)}%</span>
                </div>
                <PctBar value={metrics.gpu_percent} color="violet" />
              </div>
              <div className="flex justify-between items-center bg-slate-800/20 p-2 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Thermal Status</span>
                <span className={`text-xs font-mono font-bold ${(metrics.gpu_temp_c ?? 0) > 75 ? "text-red-400" : "text-emerald-400"}`}>
                  {metrics.gpu_temp_c ?? "—"}°C
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </ConnectorCard>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function InfraHub() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <MonitorDot size={20} />
            </div>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">InfraHub</h1>
          </div>
          <p className="text-slate-400 text-sm max-w-xl font-medium">
            Core infrastructure control plane. Managing virtualization layers, container runtime, and node telemetry.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex gap-2"
        >
          {["Docker", "Hyper-V", "ESXi", "Kubernetes"].map(tag => (
            <span key={tag} className="px-3 py-1 rounded-lg bg-slate-800/40 border border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              {tag}
            </span>
          ))}
        </motion.div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        <VirtualizationCard />
        <DockerCard />
        <MonitoringCard />
        
        {/* Placeholder for future expansion */}
        <GlassCard className="flex flex-col items-center justify-center h-full min-h-[420px] bg-slate-900/10 border-dashed border-slate-700/50 text-slate-600 group hover:border-slate-600 transition-all duration-500">
          <Layers size={32} className="opacity-20 mb-4 group-hover:scale-110 transition-transform duration-500" />
          <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">Expansion Slot</div>
          <div className="text-[10px] opacity-30 mt-1 italic tracking-tighter">Awaiting new connector modules...</div>
        </GlassCard>
      </div>
    </div>
  );
}
