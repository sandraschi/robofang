import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  Brain,
  FileText,
  Search,
  ImageIcon,
  BookOpen,
  RefreshCw,
  AlertCircle,
  Folder,
  ExternalLink,
  ScanSearch,
  Library,
  Star,
  Database,
  Type,
  Activity
} from "lucide-react";
import GlassCard from "../components/ui/GlassCard";

// ── Shared Constants ──────────────────────────────────────────────────────────
const BRIDGE = "http://localhost:10871";

// ── Shared Helper Operations ──────────────────────────────────────────────────
async function knowledgeGet(connector: string, path: string) {
  const r = await axios.get(`${BRIDGE}/home/${connector}/${path}`, { timeout: 10000 });
  return r.data;
}

async function knowledgePost(connector: string, path: string, body: unknown = {}) {
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
    <GlassCard className="flex flex-col h-full bg-slate-900/40 border-slate-700/50 hover:border-indigo-500/30 transition-all duration-500 group overflow-hidden min-h-[480px]">
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
          {!online && !loading && (
             <button
                onClick={() => launchConnector(title.toLowerCase().replace(" ", "-"))}
                className="px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[9px] font-bold text-indigo-400 border border-indigo-500/20 transition-all uppercase tracking-tighter"
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
            title="Refresh Knowledge Connector"
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
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-white/5 rounded skeleton-box" style={{ "--w": `${65 + (i % 4) * 8}%` } as React.CSSProperties} />
                ))}
            </div>
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
                <div className="text-xs font-bold text-red-400 capitalize mb-1">Knowledge Link Severed</div>
                <div className="text-[10px] text-slate-500 leading-relaxed max-w-[200px]">{error}</div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
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

// ── Hub Components ──────────────────────────────────────────────────────────

function AdvancedMemoryCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{active_project?: string, total_notes?: number, total_projects?: number, total_observations?: number} | null>(null);
  const [recent, setRecent] = useState<{id: string, title: string, project?: string, tags?: string[], updated_at?: string}[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{id: string, title: string, project?: string, tags?: string[], updated_at?: string}[] | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [st, rc] = await Promise.allSettled([
        knowledgeGet("advanced-memory", "status"),
        knowledgeGet("advanced-memory", "notes/recent?limit=8"),
      ]);
      if (st.status === "fulfilled") {
        setStats(st.value?.stats || st.value);
        setOnline(true);
      }
      if (rc.status === "fulfilled") {
        const raw = rc.value;
        setRecent(Array.isArray(raw?.notes) ? raw.notes : Array.isArray(raw) ? raw : []);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const search = async () => {
    if (!query.trim()) { setResults(null); return; }
    setSearching(true);
    try {
      const r = await knowledgePost("advanced-memory", "notes/search", { query, limit: 8 });
      setResults(Array.isArray(r?.results) ? r.results : []);
    } catch { setResults([]); }
    setSearching(false);
  };

  const display = results ?? recent;

  return (
    <ConnectorCard
      title="Advanced Memory" subtitle={stats?.active_project ? `Project: ${stats.active_project}` : "Neural Storage"}
      icon={<Brain size={18} />} online={online} loading={loading} error={error} 
      onRefresh={fetch} port={10705}
    >
      <div className="space-y-4">
        {stats && (
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: "Notes", val: stats.total_notes, icon: <FileText size={10}/> },
                    { label: "Projects", val: stats.total_projects, icon: <Folder size={10}/> },
                    { label: "Obs", val: stats.total_observations, icon: <Activity size={10}/> }
                ].map(s => (
                    <div key={s.label} className="bg-slate-800/40 rounded-lg p-2 border border-white/5">
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 uppercase tracking-tighter mb-0.5">
                            {s.icon} {s.label}
                        </div>
                        <div className="text-sm font-bold text-slate-200 font-mono">{s.val ?? "—"}</div>
                    </div>
                ))}
            </div>
        )}

        <div className="relative group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-indigo-400 transition-colors" size={12} />
            <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Query neural network..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/20 border border-white/5 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 transition-all font-mono"
            />
            {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <RefreshCw size={10} className="animate-spin text-indigo-500" />
                </div>
            )}
        </div>

        <div className="space-y-1.5">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest px-1 flex items-center justify-between">
                <span>{results ? "Search Results" : "Recent Memories"}</span>
                {results && <button onClick={() => {setResults(null); setQuery("");}} className="hover:text-slate-300">Clear</button>}
            </div>
            <div className="space-y-1 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                {display.map((n, i) => (
                <div key={i} className="group/item flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.03] hover:border-indigo-500/20 hover:bg-white/[0.05] transition-all cursor-default relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/0 group-hover/item:bg-indigo-500/40 transition-all" />
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate pr-4">{n.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                             <div className="text-[9px] text-indigo-400/70 font-bold uppercase tracking-tighter truncate max-w-[80px]">
                                {n.project || "General"}
                            </div>
                            {n.tags?.slice(0, 2).map((t: string) => (
                                <span key={t} className="text-[9px] text-slate-600">#{t}</span>
                            ))}
                        </div>
                    </div>
                    <div className="text-[9px] text-slate-700 font-mono opacity-0 group-hover/item:opacity-100 transition-opacity">
                        {n.updated_at?.slice(5, 10)}
                    </div>
                </div>
                ))}
                {display.length === 0 && <div className="text-center py-8 text-[10px] text-slate-600 italic">No corresponding memories matched.</div>}
            </div>
        </div>
      </div>
    </ConnectorCard>
  );
}

function NotionCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<{id: string, name: string, type?: string, icon?: string, title?: string, last_edited?: string}[]>([]);
  const [databases, setDatabases] = useState<{id: string, name: string, type?: string, title?: string, entry_count?: number}[]>([]);
  const [tab, setTab] = useState<"pages" | "databases">("pages");

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [pg, db] = await Promise.allSettled([
        knowledgeGet("notion", "pages/recent?limit=10"),
        knowledgeGet("notion", "databases"),
      ]);
      if (pg.status === "fulfilled") {
        const raw = pg.value;
        setPages(Array.isArray(raw?.pages) ? raw.pages : Array.isArray(raw) ? raw : []);
        setOnline(true);
      }
      if (db.status === "fulfilled") {
        const raw = db.value;
        setDatabases(Array.isArray(raw?.databases) ? raw.databases : Array.isArray(raw) ? raw : []);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <ConnectorCard
      title="Notion" subtitle="Workspace Intelligence"
      icon={<FileText size={18} />} online={online} loading={loading} error={error} 
      onRefresh={fetch} port={10811}
    >
        <div className="space-y-4">
            <div className="flex p-1 rounded-xl bg-slate-800/40 border border-white/5">
                {(["pages", "databases"] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            tab === t 
                                ? "bg-indigo-500/20 text-indigo-300 shadow-inner" 
                                : "text-slate-500 hover:text-slate-300"
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                {tab === "pages" ? (
                    pages.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-slate-500/20 hover:bg-white/[0.05] transition-all group/page">
                            <span className="text-lg grayscale group-hover/page:grayscale-0 transition-all">{p.icon || "📄"}</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-200 truncate group-hover/page:text-indigo-300 transition-colors uppercase tracking-tight">
                                    {p.title || "Untitled Fragment"}
                                </div>
                                <div className="text-[9px] text-slate-600 font-mono mt-0.5">
                                    {p.last_edited?.split('T')[0]}
                                </div>
                            </div>
                            <ExternalLink size={12} className="text-slate-700 opacity-0 group-hover/page:opacity-100 transition-all cursor-pointer hover:text-indigo-400" />
                        </div>
                    ))
                ) : (
                    databases.map(d => (
                         <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-amber-500/20 hover:bg-white/[0.05] transition-all group/db">
                            <Database size={14} className="text-slate-600 group-hover/db:text-amber-500/70 transition-colors" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-200 truncate uppercase tracking-tight">
                                    {d.title || "Schema Registry"}
                                </div>
                                <div className="text-[9px] text-slate-600 font-mono mt-0.5">
                                    {d.entry_count ?? 0} Global Entries
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {((tab === "pages" ? pages : databases).length === 0) && (
                    <div className="text-center py-12 text-[10px] text-slate-700 italic">No workspace data indexed.</div>
                )}
            </div>
        </div>
    </ConnectorCard>
  );
}

function FastSearchCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{index_size_mb?: number, total_files?: number, indexed_files?: number} | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{id: string, name: string, filename?: string, path?: string, snippet?: string}[]>([]);
  const [searching, setSearching] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await knowledgeGet("fastsearch", "index/stats");
      setStats(data?.stats || data);
      setOnline(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await knowledgePost("fastsearch", "search", { query, limit: 10 });
      setResults(Array.isArray(r?.results) ? r.results : Array.isArray(r) ? r : []);
    } catch { setResults([]); }
    setSearching(false);
  };

  return (
    <ConnectorCard
      title="FastSearch" subtitle="Filesystem Indexer"
      icon={<ScanSearch size={18} />} online={online} loading={loading} error={error} 
      onRefresh={fetch} port={10845}
    >
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/40 rounded-lg p-2 border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase tracking-tighter mb-0.5">Volumes Indexed</div>
                    <div className="text-sm font-bold text-slate-200 font-mono">{stats?.indexed_files?.toLocaleString() ?? "—"}</div>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-2 border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase tracking-tighter mb-0.5">Heap Utilization</div>
                    <div className="text-sm font-bold text-slate-200 font-mono">{stats?.index_size_mb ?? "—"} MB</div>
                </div>
            </div>

            <div className="relative group/search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-yellow-400 transition-colors" size={12} />
                <input
                    value={query} onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                    placeholder="Search local storage..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/20 border border-white/5 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-500/40 transition-all font-mono"
                />
                {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <RefreshCw size={10} className="animate-spin text-yellow-500" />
                    </div>
                )}
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                {results.map((r, i) => (
                    <div key={i} className="group/res p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-yellow-500/20 transition-all cursor-default">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText size={10} className="text-yellow-500/60" />
                            <div className="text-[11px] font-bold text-slate-200 truncate uppercase tracking-tighter">{(r as {filename?: string, name?: string}).filename || (r as {filename?: string, name?: string}).name}</div>
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono truncate pl-4 opacity-50">{r.path}</div>
                        {r.snippet && (
                            <div className="mt-1.5 text-[10px] text-slate-400 bg-slate-950/30 p-1.5 rounded-lg border border-white/5 line-clamp-2 italic">
                                "{r.snippet}"
                            </div>
                        )}
                    </div>
                ))}
                {results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-700 opacity-40">
                         <Type size={20} className="mb-2" />
                         <div className="text-[10px] uppercase font-bold tracking-widest">Entry Search Mode</div>
                    </div>
                )}
            </div>
        </div>
    </ConnectorCard>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function KnowledgeHub() {
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
              <Library size={20} />
            </div>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">KnowledgeHub</h1>
          </div>
          <p className="text-slate-400 text-sm max-w-xl font-medium">
            Unified cognitive interface for cross-platform intelligence. Synthesizing data from neural memory, workspaces, and distributed search layers.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex gap-2"
        >
          {["Wave 4", "Index: 1.4M", "Verified"].map(tag => (
            <span key={tag} className="px-3 py-1 rounded-lg bg-slate-800/40 border border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              {tag}
            </span>
          ))}
        </motion.div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        <AdvancedMemoryCard />
        <NotionCard />
        <FastSearchCard />
        
        {/* Fillers / Incoming */}
        <div className="space-y-8">
            <div className="h-1/2 p-6 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center group">
                <ImageIcon size={24} className="text-slate-800 mb-3 grayscale group-hover:grayscale-0 transition-all opacity-40 group-hover:opacity-100" />
                <div className="text-[10px] font-bold text-slate-700 group-hover:text-slate-500 uppercase tracking-[0.2em] transition-colors">Immich Node</div>
                <div className="text-[9px] text-slate-800 mt-1 uppercase tracking-tighter">Connector Pending</div>
            </div>
            <div className="h-1/2 p-6 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center group">
                <BookOpen size={24} className="text-slate-800 mb-3 grayscale group-hover:grayscale-0 transition-all opacity-40 group-hover:opacity-100" />
                <div className="text-[10px] font-bold text-slate-700 group-hover:text-slate-500 uppercase tracking-[0.2em] transition-colors">Readly Archiver</div>
                <div className="text-[9px] text-slate-800 mt-1 uppercase tracking-tighter">Sync Blocked</div>
            </div>
        </div>

        <GlassCard className="flex flex-col items-center justify-center h-full min-h-[480px] bg-indigo-500/5 border-dashed border-indigo-500/20 text-indigo-500/40 group hover:border-indigo-500/40 transition-all duration-500">
          <Star size={32} className="opacity-20 mb-4 group-hover:scale-110 transition-transform duration-500 animate-pulse" />
          <div className="text-xs font-bold uppercase tracking-[0.2em]">Cortex expansion</div>
          <div className="text-[10px] mt-1 italic tracking-tighter">Unified cognitive mapping in progress...</div>
        </GlassCard>
      </div>
    </div>
  );
}
