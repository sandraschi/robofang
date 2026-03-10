/**
 * InfraHub — Wave 3 Infrastructure
 * Connectors: virtualization, docker, windows-operations, monitoring, tailscale
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  Server,
  Container,
  Terminal,
  Activity,
  RefreshCw,
  Play,
  Square,
  Pause,
  AlertCircle,
  Layers,
  MonitorDot,
  Shield,
} from "lucide-react";

const BRIDGE = "http://localhost:10871";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function infraGet(connector: string, path: string) {
  const r = await axios.get(`${BRIDGE}/home/${connector}/${path}`, { timeout: 10000 });
  return r.data;
}

async function infraPost(connector: string, path: string, body: unknown = {}) {
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

// ---------------------------------------------------------------------------
// Shared card shell (same pattern as Wave 1/2)
// ---------------------------------------------------------------------------

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-white/5 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}

interface CardShellProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accentClass: string; // full border + bg + shadow tailwind classes
  online: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  children: React.ReactNode;
  port: number;
}

function ConnectorCard({
  title, subtitle, icon, accentClass, online, loading, error, onRefresh, children, port,
}: CardShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex flex-col rounded-2xl border bg-white/[0.03] backdrop-blur-md shadow-lg overflow-hidden group hover:border-white/20 transition-all duration-500 ${accentClass}`}
      style={{ minHeight: '420px' } as any}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
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
            title="Refresh infrastructure data"
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-100 transition-all active:scale-90"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar text-sm">
        {loading ? <Skeleton /> : error ? (
          <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        ) : children}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Percent bar
// ---------------------------------------------------------------------------

function PctBar({ value, color = "indigo" }: { value: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    sky: "bg-sky-500",
    violet: "bg-violet-500",
  };
  const bar = colorMap[color] ?? "bg-indigo-500";
  const dangerColor = pct > 85 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : bar;
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${dangerColor}`} style={{ width: `${pct}%` } as any} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// VirtualizationCard
// ---------------------------------------------------------------------------

interface VM {
  name: string;
  state: string;
  memory_mb?: number;
  cpus?: number;
  os?: string;
}

function VirtualizationCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vms, setVMs] = useState<VM[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await infraGet("virtualization", "vms");
      const list: VM[] = Array.isArray(data?.vms) ? data.vms : Array.isArray(data) ? data : [];
      setVMs(list);
      setOnline(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const vmAction = async (name: string, action: string) => {
    setMsg(`${action} ${name}…`);
    try {
      await infraPost("virtualization", `vms/${encodeURIComponent(name)}/${action}`, {});
      setMsg(`${name}: ${action} sent ✓`);
      setTimeout(fetch, 1500);
    } catch { setMsg(`${action} failed for ${name}`); }
    setTimeout(() => setMsg(null), 4000);
  };

  const running = vms.filter((v) => v.state === "running").length;
  const stopped = vms.length - running;

  return (
    <ConnectorCard
      title="Virtualization" subtitle={`VirtualBox — ${vms.length} VMs`}
      icon={<Server size={18} />} accentClass="border-sky-500/30 shadow-sky-500/10"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10700}
    >
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-slate-400 text-xs">Total</div>
          <div className="text-slate-100 font-semibold">{vms.length}</div>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-2">
          <div className="text-slate-400 text-xs">Running</div>
          <div className="text-emerald-400 font-semibold">{running}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-slate-400 text-xs">Stopped</div>
          <div className="text-slate-400 font-semibold">{stopped}</div>
        </div>
      </div>

      <div className="space-y-1.5 max-h-56 overflow-y-auto">
        {vms.length === 0 && <div className="text-slate-500 text-xs">No VMs found</div>}
        {vms.map((vm) => (
          <div key={vm.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06]">
            <div className={`w-2 h-2 rounded-full shrink-0 ${vm.state === "running" ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 text-xs font-medium truncate">{vm.name}</div>
              <div className="text-slate-500 text-xs">{vm.state} {vm.cpus && `· ${vm.cpus} vCPU`} {vm.memory_mb && `· ${Math.round(vm.memory_mb / 1024)}GB`}</div>
            </div>
            <div className="flex gap-1 shrink-0">
              {vm.state !== "running" && (
                <button onClick={() => vmAction(vm.name, "start")}
                  className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors" title="Start">
                  <Play size={10} />
                </button>
              )}
              {vm.state === "running" && (
                <>
                  <button onClick={() => vmAction(vm.name, "pause")}
                    className="p-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-colors" title="Pause">
                    <Pause size={10} />
                  </button>
                  <button onClick={() => vmAction(vm.name, "stop")}
                    className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors" title="Stop">
                    <Square size={10} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {msg && <div className="mt-2 text-xs text-sky-300 text-center">{msg}</div>}
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// DockerCard
// ---------------------------------------------------------------------------

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports?: string;
}

function DockerCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await infraGet("docker", "containers");
      const list: DockerContainer[] = Array.isArray(data?.containers) ? data.containers
        : Array.isArray(data) ? data : [];
      setContainers(list);
      setOnline(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const containerAction = async (id: string, action: string, name: string) => {
    setMsg(`${action} ${name}…`);
    try {
      await infraPost("docker", `containers/${id}/${action}`, {});
      setMsg(`${name}: ${action} ✓`);
      setTimeout(fetch, 1200);
    } catch { setMsg(`${action} failed`); }
    setTimeout(() => setMsg(null), 4000);
  };

  const visible = containers.filter((c) =>
    !filter || c.name.toLowerCase().includes(filter.toLowerCase()) || c.image.toLowerCase().includes(filter.toLowerCase())
  );
  const running = containers.filter((c) => c.state === "running").length;

  return (
    <ConnectorCard
      title="Docker" subtitle={`${running}/${containers.length} containers running`}
      icon={<Container size={18} />} accentClass="border-blue-500/30 shadow-blue-500/10"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10807}
    >
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-slate-400 text-xs">Total</div>
          <div className="text-slate-100 font-semibold">{containers.length}</div>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-2">
          <div className="text-slate-400 text-xs">Running</div>
          <div className="text-emerald-400 font-semibold">{running}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-slate-400 text-xs">Stopped</div>
          <div className="text-slate-400 font-semibold">{containers.length - running}</div>
        </div>
      </div>

      <input
        value={filter} onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter containers…"
        className="w-full mb-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500/40"
      />

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {visible.length === 0 && <div className="text-slate-500 text-xs">No containers match</div>}
        {visible.map((c) => (
          <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.03] hover:bg-white/[0.06]">
            <div className={`w-2 h-2 rounded-full shrink-0 ${c.state === "running" ? "bg-emerald-400" : "bg-slate-600"}`} />
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 text-xs font-medium truncate">{c.name.replace(/^\//, "")}</div>
              <div className="text-slate-500 text-xs truncate">{c.image}</div>
            </div>
            <div className="flex gap-1 shrink-0">
              {c.state === "running" ? (
                <button onClick={() => containerAction(c.id, "stop", c.name)}
                  className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors" title="Stop">
                  <Square size={10} />
                </button>
              ) : (
                <button onClick={() => containerAction(c.id, "start", c.name)}
                  className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors" title="Start">
                  <Play size={10} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {msg && <div className="mt-2 text-xs text-blue-300 text-center">{msg}</div>}
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// WindowsOpsCard
// ---------------------------------------------------------------------------

interface WinProcess { name: string; pid: number; cpu?: number; memory_mb?: number; }
interface WinService { name: string; display_name: string; status: string; }

function WindowsOpsCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processes, setProcesses] = useState<WinProcess[]>([]);
  const [services, setServices] = useState<WinService[]>([]);
  const [tab, setTab] = useState<"processes" | "services">("processes");
  const [cmd, setCmd] = useState("");
  const [cmdResult, setCmdResult] = useState<string | null>(null);
  const [cmdLoading, setCmdLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [pr, sv] = await Promise.allSettled([
        infraGet("windows-operations", "processes/top"),
        infraGet("windows-operations", "services"),
      ]);
      if (pr.status === "fulfilled") {
        const raw = pr.value;
        setProcesses(Array.isArray(raw?.processes) ? raw.processes.slice(0, 15) : []);
        setOnline(true);
      }
      if (sv.status === "fulfilled") {
        const raw = sv.value;
        setServices(Array.isArray(raw?.services) ? raw.services.slice(0, 12) : []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const runCmd = async () => {
    if (!cmd.trim()) return;
    setCmdLoading(true); setCmdResult(null);
    try {
      const r = await infraPost("windows-operations", "shell/run", { command: cmd, timeout: 15 });
      setCmdResult(r?.stdout || r?.output || JSON.stringify(r).slice(0, 500));
    } catch (e: any) {
      setCmdResult(`Error: ${e?.response?.data?.error || e.message}`);
    } finally { setCmdLoading(false); }
  };

  return (
    <ConnectorCard
      title="Windows Ops" subtitle="Processes · Services · Shell"
      icon={<Terminal size={18} />} accentClass="border-purple-500/30 shadow-purple-500/10"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10749}
    >
      {/* Mini shell */}
      <div className="mb-3">
        <div className="flex gap-1">
          <input
            value={cmd} onChange={(e) => setCmd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runCmd()}
            placeholder="PowerShell command…"
            className="flex-1 px-3 py-1.5 rounded-l-lg bg-white/[0.05] border border-white/10 border-r-0 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-purple-500/40 font-mono"
          />
          <button onClick={runCmd} disabled={cmdLoading}
            className="px-3 py-1.5 rounded-r-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-medium transition-colors disabled:opacity-50">
            {cmdLoading ? "…" : "Run"}
          </button>
        </div>
        {cmdResult && (
          <pre className="mt-1.5 p-2 rounded bg-black/40 border border-white/5 text-xs text-slate-300 font-mono max-h-20 overflow-auto whitespace-pre-wrap break-all">
            {cmdResult}
          </pre>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-2">
        {(["processes", "services"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${tab === t ? "bg-purple-500/20 text-purple-300" : "bg-white/5 text-slate-500 hover:text-slate-300"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "processes" && (
        <div className="space-y-1 max-h-44 overflow-y-auto">
          {processes.map((p) => (
            <div key={p.pid} className="flex items-center gap-2 px-2 py-1 rounded bg-white/[0.03]">
              <span className="text-slate-500 text-xs w-8 text-right shrink-0">{p.pid}</span>
              <span className="text-slate-300 text-xs truncate flex-1">{p.name}</span>
              {p.cpu != null && <span className="text-slate-500 text-xs shrink-0">{p.cpu.toFixed(1)}%</span>}
              {p.memory_mb != null && <span className="text-slate-500 text-xs shrink-0">{p.memory_mb}MB</span>}
            </div>
          ))}
          {processes.length === 0 && <div className="text-slate-500 text-xs">No process data</div>}
        </div>
      )}

      {tab === "services" && (
        <div className="space-y-1 max-h-44 overflow-y-auto">
          {services.map((s) => (
            <div key={s.name} className="flex items-center gap-2 px-2 py-1 rounded bg-white/[0.03]">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.status === "Running" ? "bg-emerald-400" : "bg-slate-600"}`} />
              <span className="text-slate-300 text-xs truncate flex-1">{s.display_name || s.name}</span>
              <span className={`text-xs shrink-0 ${s.status === "Running" ? "text-emerald-400" : "text-slate-600"}`}>{s.status}</span>
            </div>
          ))}
          {services.length === 0 && <div className="text-slate-500 text-xs">No service data</div>}
        </div>
      )}
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// MonitoringCard  — system metrics with gauges
// ---------------------------------------------------------------------------

interface SysMetrics {
  cpu_percent: number;
  memory_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  gpu_percent?: number;
  gpu_memory_percent?: number;
  gpu_temp_c?: number;
  cpu_temp_c?: number;
  net_recv_mb?: number;
  net_sent_mb?: number;
  uptime_h?: number;
}

function MetricRow({ label, value, pct, color, unit }: { label: string; value: string; pct: number; color: string; unit?: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value}{unit}</span>
      </div>
      <PctBar value={pct} color={color} />
    </div>
  );
}

function MonitoringCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SysMetrics | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await infraGet("monitoring", "metrics/current");
      setMetrics(data?.metrics || data);
      setOnline(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); const t = setInterval(fetch, 10000); return () => clearInterval(t); }, [fetch]);

  const m = metrics;

  return (
    <ConnectorCard
      title="Monitoring" subtitle="Goliath — live system metrics"
      icon={<Activity size={18} />} accentClass="border-emerald-500/30 shadow-emerald-500/10"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10809}
    >
      {m && (
        <div className="space-y-3">
          {/* CPU + RAM */}
          <div className="space-y-2">
            <MetricRow label="CPU" value={`${m.cpu_percent.toFixed(1)}%`} pct={m.cpu_percent} color="indigo" />
            <MetricRow label="RAM" value={`${m.memory_used_gb?.toFixed(1) ?? "?"}/${m.memory_total_gb ?? "?"}GB`} pct={m.memory_percent} color="sky" />
            <MetricRow label="Disk" value={`${m.disk_used_gb?.toFixed(0) ?? "?"}/${m.disk_total_gb ?? "?"}GB`} pct={m.disk_percent} color="amber" />
          </div>

          {/* GPU row if present */}
          {m.gpu_percent != null && (
            <div className="space-y-2 border-t border-white/5 pt-2">
              <MetricRow label="GPU" value={`${m.gpu_percent.toFixed(1)}%`} pct={m.gpu_percent} color="violet" />
              {m.gpu_memory_percent != null && (
                <MetricRow label="GPU VRAM" value={`${m.gpu_memory_percent.toFixed(1)}%`} pct={m.gpu_memory_percent} color="violet" />
              )}
              {m.gpu_temp_c != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">GPU Temp</span>
                  <span className={`font-mono ${m.gpu_temp_c > 80 ? "text-red-400" : m.gpu_temp_c > 65 ? "text-amber-400" : "text-emerald-400"}`}>
                    {m.gpu_temp_c}°C
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Network + uptime */}
          {(m.net_recv_mb != null || m.uptime_h != null) && (
            <div className="border-t border-white/5 pt-2 grid grid-cols-2 gap-2">
              {m.net_recv_mb != null && (
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-slate-400 text-xs">Net ↓</div>
                  <div className="text-slate-200 text-xs font-mono">{m.net_recv_mb.toFixed(1)} MB/s</div>
                </div>
              )}
              {m.net_sent_mb != null && (
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-slate-400 text-xs">Net ↑</div>
                  <div className="text-slate-200 text-xs font-mono">{m.net_sent_mb.toFixed(1)} MB/s</div>
                </div>
              )}
              {m.uptime_h != null && (
                <div className="bg-white/5 rounded-lg p-2 col-span-2">
                  <div className="text-slate-400 text-xs">Uptime</div>
                  <div className="text-slate-200 text-xs font-mono">{Math.floor(m.uptime_h)}h {Math.round((m.uptime_h % 1) * 60)}m</div>
                </div>
              )}
            </div>
          )}

          <div className="text-slate-600 text-xs text-right">auto-refresh 10s</div>
        </div>
      )}
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// TailscaleCard
// ---------------------------------------------------------------------------

interface TailscalePeer {
  hostname: string;
  ip: string;
  os?: string;
  online: boolean;
  exit_node?: boolean;
  tags?: string[];
}

interface TailscaleStatus {
  self_hostname?: string;
  self_ip?: string;
  network_name?: string;
  connected: boolean;
}

function TailscaleCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TailscaleStatus | null>(null);
  const [peers, setPeers] = useState<TailscalePeer[]>([]);
  const [filter, setFilter] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [st, pe] = await Promise.allSettled([
        infraGet("tailscale", "status"),
        infraGet("tailscale", "peers"),
      ]);
      if (st.status === "fulfilled") { setStatus(st.value?.status || st.value); setOnline(true); }
      if (pe.status === "fulfilled") {
        const raw = pe.value;
        setPeers(Array.isArray(raw?.peers) ? raw.peers : []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const visible = peers.filter((p) =>
    !filter || p.hostname.toLowerCase().includes(filter.toLowerCase()) || p.ip.includes(filter)
  );
  const onlinePeers = peers.filter((p) => p.online).length;

  return (
    <ConnectorCard
      title="Tailscale" subtitle={status?.network_name || "Mesh VPN"}
      icon={<Shield size={18} />} accentClass="border-teal-500/30 shadow-teal-500/10"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10821}
    >
      {status && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Self</div>
            <div className="text-slate-200 text-xs font-mono truncate">{status.self_hostname || "—"}</div>
            <div className="text-slate-500 text-xs font-mono">{status.self_ip || ""}</div>
          </div>
          <div className={`rounded-lg p-2 ${status.connected ? "bg-teal-500/15" : "bg-red-500/10"}`}>
            <div className="text-slate-400 text-xs">VPN</div>
            <div className={`font-semibold text-xs ${status.connected ? "text-teal-400" : "text-red-400"}`}>
              {status.connected ? "connected" : "disconnected"}
            </div>
            <div className="text-slate-500 text-xs">{onlinePeers}/{peers.length} peers up</div>
          </div>
        </div>
      )}

      <input
        value={filter} onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter peers…"
        className="w-full mb-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
      />

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {visible.length === 0 && <div className="text-slate-500 text-xs">No peers</div>}
        {visible.map((p) => (
          <div key={p.ip} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.03] hover:bg-white/[0.06]">
            <div className={`w-2 h-2 rounded-full shrink-0 ${p.online ? "bg-teal-400 animate-pulse" : "bg-slate-600"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-200 text-xs font-medium truncate">{p.hostname}</span>
                {p.exit_node && <span className="text-xs px-1 py-0.5 rounded bg-teal-500/20 text-teal-400">exit</span>}
              </div>
              <div className="text-slate-500 text-xs font-mono">{p.ip} {p.os && `· ${p.os}`}</div>
            </div>
          </div>
        ))}
      </div>
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// Status strip
// ---------------------------------------------------------------------------

const WAVE3_CONNECTORS = [
  { key: "virtualization", label: "VirtualBox", port: 10700 },
  { key: "docker", label: "Docker", port: 10807 },
  { key: "windows-operations", label: "WinOps", port: 10749 },
  { key: "monitoring", label: "Monitor", port: 10809 },
  { key: "tailscale", label: "Tailscale", port: 10821 },
];

function StatusStrip() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    axios.get(`${BRIDGE}/home`).then((r) => {
      const c = r.data?.connectors || {};
      const result: Record<string, boolean> = {};
      for (const { key } of WAVE3_CONNECTORS) result[key] = c[key]?.online ?? false;
      setStatuses(result);
    }).catch(() => { });
  }, []);

  return (
    <div className="hidden md:flex items-center gap-2 flex-wrap">
      {WAVE3_CONNECTORS.map(({ key, label }) => (
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
// Page — 2×3 grid (5 cards + empty or future slot)
// ---------------------------------------------------------------------------

export default function InfraHub() {
  return (
    <div className="space-y-12">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <MonitorDot size={22} className="text-emerald-400" />
            <h1 className="text-xl font-bold text-slate-100">Infra Hub</h1>
          </div>
          <p className="text-sm text-slate-400">Wave 3 connectors — VMs, containers, shell, metrics, mesh VPN.</p>
        </div>
        <StatusStrip />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        <VirtualizationCard />
        <DockerCard />
        <WindowsOpsCard />
        <MonitoringCard />
        <TailscaleCard />
        {/* Wave 4 placeholder — Knowledge Hub coming next */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-slate-600 text-xs gap-2"
          style={{ minHeight: 420 }}
        >
          <Layers size={24} className="opacity-40" />
          <span>Wave 4 — Knowledge Hub</span>
          <span className="text-slate-700">advanced-memory · notion · immich</span>
        </motion.div>
      </div>
    </div>
  );
}
