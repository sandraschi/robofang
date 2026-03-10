import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  Brain,
  FileText,
  Search,
  Image as ImageIcon,
  BookOpen,
  RefreshCw,
  AlertCircle,
  Folder,
  ExternalLink,
  BookMarked,
  ScanSearch,
  Library,
  Star,
} from "lucide-react";

const BRIDGE = "http://localhost:10871";

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

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-white/5 rounded" style={{ width: `${65 + (i % 4) * 8}%` } as any} />
      ))}
    </div>
  );
}

interface CardShellProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accentClass: string;
  online: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  children: React.ReactNode;
  port: number;
}

function ConnectorCard({ title, subtitle, icon, accentClass, online, loading, error, onRefresh, children, port }: CardShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex flex-col rounded-2xl border bg-white/[0.03] backdrop-blur-md shadow-lg overflow-hidden group hover:border-white/20 transition-all duration-500 ${accentClass}`}
      style={{ minHeight: 420 }}
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
            title="Refresh knowledge source data"
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
// AdvancedMemoryCard
// ---------------------------------------------------------------------------

interface MemNote {
  title: string;
  permalink: string;
  tags?: string[];
  updated_at?: string;
  project?: string;
}

interface MemStats {
  total_notes?: number;
  total_projects?: number;
  total_observations?: number;
  active_project?: string;
}

function AdvancedMemoryCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MemStats | null>(null);
  const [recent, setRecent] = useState<MemNote[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemNote[] | null>(null);
  const [searching, setSearching] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null); setResults(null);
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
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const search = async () => {
    if (!query.trim()) { setResults(null); return; }
    setSearching(true);
    try {
      const r = await knowledgePost("advanced-memory", "notes/search", { query, limit: 8 });
      setResults(Array.isArray(r?.results) ? r.results : Array.isArray(r) ? r : []);
    } catch { setResults([]); }
    setSearching(false);
  };

  const display = results ?? recent;

  return (
    <ConnectorCard
      title="Advanced Memory" subtitle={stats?.active_project ? `Project: ${stats.active_project}` : "ADN Knowledge Base"}
      icon={<Brain size={18} />} accentClass="border-indigo-500/30 shadow-indigo-500/10"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10705}
    >
      {stats && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Notes</div>
            <div className="text-slate-100 font-semibold">{stats.total_notes ?? "—"}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Projects</div>
            <div className="text-slate-100 font-semibold">{stats.total_projects ?? "—"}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Observations</div>
            <div className="text-slate-100 font-semibold">{stats.total_observations ?? "—"}</div>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-2">
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search notes…"
          className="flex-1 px-3 py-1.5 rounded-l-lg bg-white/[0.05] border border-white/10 border-r-0 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500/40"
        />
        <button onClick={search} disabled={searching}
          className="px-3 py-1.5 rounded-r-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors disabled:opacity-50">
          {searching ? "…" : <Search size={12} />}
        </button>
      </div>

      {results !== null && (
        <div className="text-xs text-slate-500 mb-1">
          {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
        </div>
      )}

      <div className="space-y-1 max-h-52 overflow-y-auto">
        {display.length === 0 && <div className="text-slate-500 text-xs">No notes found</div>}
        {display.map((n, i) => (
          <div key={i} className="px-2 py-1.5 rounded bg-white/[0.03] hover:bg-white/[0.06] cursor-default">
            <div className="text-slate-200 text-xs font-medium truncate">{n.title}</div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {n.project && <span className="text-indigo-400 text-xs">{n.project}</span>}
              {n.tags?.slice(0, 3).map((t) => (
                <span key={t} className="text-slate-600 text-xs">#{t}</span>
              ))}
              {n.updated_at && (
                <span className="text-slate-600 text-xs ml-auto">{n.updated_at.slice(0, 10)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// NotionCard
// ---------------------------------------------------------------------------

interface NotionPage {
  id: string;
  title: string;
  url?: string;
  last_edited?: string;
  icon?: string;
}

interface NotionDB {
  id: string;
  title: string;
  entry_count?: number;
}

function NotionCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [databases, setDatabases] = useState<NotionDB[]>([]);
  const [tab, setTab] = useState<"pages" | "databases">("pages");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NotionPage[] | null>(null);
  const [searching, setSearching] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null); setResults(null);
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
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const search = async () => {
    if (!query.trim()) { setResults(null); return; }
    setSearching(true);
    try {
      const r = await knowledgePost("notion", "search", { query, limit: 8 });
      setResults(Array.isArray(r?.results) ? r.results : []);
    } catch { setResults([]); }
    setSearching(false);
  };

  return (
    <ConnectorCard
      title="Notion" subtitle={`${pages.length} recent pages · ${databases.length} databases`}
      icon={<FileText size={18} />} accentClass="border-slate-500/30 shadow-slate-500/10"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10811}
    >
      <div className="flex gap-1 mb-2">
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search Notion…"
          className="flex-1 px-3 py-1.5 rounded-l-lg bg-white/[0.05] border border-white/10 border-r-0 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-slate-400/40"
        />
        <button onClick={search} disabled={searching}
          className="px-3 py-1.5 rounded-r-lg bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium transition-colors disabled:opacity-50">
          {searching ? "…" : <Search size={12} />}
        </button>
      </div>

      <div className="flex gap-1 mb-2">
        {(["pages", "databases"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setResults(null); setQuery(""); }}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${tab === t ? "bg-white/15 text-slate-200" : "bg-white/5 text-slate-500 hover:text-slate-300"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "pages" && (
        <div className="space-y-1 max-h-52 overflow-y-auto">
          {(results ?? pages).length === 0 && <div className="text-slate-500 text-xs">No pages</div>}
          {(results ?? pages).map((p) => (
            <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.03] hover:bg-white/[0.06]">
              <span className="text-base leading-none shrink-0">{p.icon || "📄"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 text-xs font-medium truncate">{p.title || "Untitled"}</div>
                {p.last_edited && <div className="text-slate-600 text-xs">{p.last_edited.slice(0, 10)}</div>}
              </div>
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  title="View in Notion"
                  className="text-slate-600 hover:text-slate-300 transition-colors shrink-0"
                >
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "databases" && (
        <div className="space-y-1 max-h-52 overflow-y-auto">
          {databases.length === 0 && <div className="text-slate-500 text-xs">No databases</div>}
          {databases.map((d) => (
            <div key={d.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.03] hover:bg-white/[0.06]">
              <Folder size={12} className="text-slate-500 shrink-0" />
              <span className="text-slate-200 text-xs truncate flex-1">{d.title || "Untitled"}</span>
              {d.entry_count != null && <span className="text-slate-600 text-xs shrink-0">{d.entry_count} entries</span>}
            </div>
          ))}
        </div>
      )}
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// FastSearchCard
// ---------------------------------------------------------------------------

interface SearchResult {
  path: string;
  filename: string;
  snippet?: string;
  score?: number;
  modified?: string;
  size_kb?: number;
}

interface SearchIndex {
  indexed_files?: number;
  index_size_mb?: number;
  last_updated?: string;
  roots?: string[];
}

function FastSearchCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await knowledgeGet("fastsearch", "index/stats");
      setIndex(data?.stats || data);
      setOnline(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true); setHasSearched(true);
    try {
      const r = await knowledgePost("fastsearch", "search", { query, limit: 10 });
      setResults(Array.isArray(r?.results) ? r.results : Array.isArray(r) ? r : []);
    } catch { setResults([]); }
    setSearching(false);
  };

  return (
    <ConnectorCard
      title="FastSearch" subtitle={index ? `${index.indexed_files?.toLocaleString() ?? "?"} files indexed` : "Local file search"}
      icon={<ScanSearch size={18} />} accentClass="border-yellow-500/30 shadow-yellow-500/10"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10845}
    >
      {index && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Indexed</div>
            <div className="text-slate-100 font-semibold text-xs">{index.indexed_files?.toLocaleString() ?? "—"} files</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Index size</div>
            <div className="text-slate-100 font-semibold text-xs">{index.index_size_mb != null ? `${index.index_size_mb} MB` : "—"}</div>
          </div>
          {index.roots && index.roots.length > 0 && (
            <div className="bg-white/5 rounded-lg p-2 col-span-2">
              <div className="text-slate-400 text-xs mb-1">Roots</div>
              {index.roots.slice(0, 3).map((r) => (
                <div key={r} className="text-slate-400 text-xs font-mono truncate">{r}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-1 mb-3">
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search files… (Enter)"
          className="flex-1 px-3 py-1.5 rounded-l-lg bg-white/[0.05] border border-white/10 border-r-0 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-yellow-500/40 font-mono"
        />
        <button onClick={search} disabled={searching}
          className="px-3 py-1.5 rounded-r-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-xs font-medium transition-colors disabled:opacity-50">
          {searching ? "…" : <Search size={12} />}
        </button>
      </div>

      {hasSearched && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          <div className="text-slate-500 text-xs mb-1">{results.length} result{results.length !== 1 ? "s" : ""}</div>
          {results.length === 0 && <div className="text-slate-500 text-xs">No matches found</div>}
          {results.map((r, i) => (
            <div key={i} className="px-2 py-1.5 rounded bg-white/[0.03] hover:bg-white/[0.06]">
              <div className="flex items-center gap-1.5 mb-0.5">
                <FileText size={11} className="text-yellow-500 shrink-0" />
                <span className="text-slate-200 text-xs font-medium truncate">{r.filename}</span>
                {r.score != null && (
                  <span className="ml-auto text-yellow-600 text-xs shrink-0">{(r.score * 100).toFixed(0)}%</span>
                )}
              </div>
              {r.snippet && (
                <div className="text-slate-500 text-xs truncate pl-4">{r.snippet}</div>
              )}
              <div className="text-slate-700 text-xs pl-4 font-mono truncate">{r.path}</div>
            </div>
          ))}
        </div>
      )}

      {!hasSearched && online && (
        <div className="flex flex-col items-center justify-center h-32 text-slate-600 gap-2">
          <Search size={20} className="opacity-40" />
          <span className="text-xs">Type a query and press Enter</span>
        </div>
      )}
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// ImmichCard
// ---------------------------------------------------------------------------

interface ImmichAlbum {
  id: string;
  albumName: string;
  assetCount: number;
  thumbnailAssetId?: string;
  createdAt?: string;
}

interface ImmichStats {
  photos?: number;
  videos?: number;
  usage_gb?: number;
}

function ImmichCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ImmichStats | null>(null);
  const [albums, setAlbums] = useState<ImmichAlbum[]>([]);
  const [query, setQuery] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [st, al] = await Promise.allSettled([
        knowledgeGet("immich", "server/statistics"),
        knowledgeGet("immich", "albums"),
      ]);
      if (st.status === "fulfilled") {
        const raw = st.value;
        setStats({ photos: raw?.photos, videos: raw?.videos, usage_gb: raw?.usage ? (raw.usage / 1e9) : undefined });
        setOnline(true);
      }
      if (al.status === "fulfilled") {
        const raw = al.value;
        setAlbums(Array.isArray(raw) ? raw.slice(0, 12) : Array.isArray(raw?.albums) ? raw.albums.slice(0, 12) : []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const visible = albums.filter((a) =>
    !query || a.albumName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ConnectorCard
      title="Immich" subtitle="Self-hosted photo library"
      icon={<ImageIcon size={18} />} accentClass="border-rose-500/30 shadow-rose-500/10"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10839}
    >
      {stats && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Photos</div>
            <div className="text-slate-100 font-semibold">{stats.photos?.toLocaleString() ?? "—"}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Videos</div>
            <div className="text-slate-100 font-semibold">{stats.videos?.toLocaleString() ?? "—"}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-400 text-xs">Storage</div>
            <div className="text-slate-100 font-semibold text-xs">{stats.usage_gb != null ? `${stats.usage_gb.toFixed(1)} GB` : "—"}</div>
          </div>
        </div>
      )}

      <input
        value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter albums…"
        className="w-full mb-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-rose-500/40"
      />

      <div className="space-y-1 max-h-52 overflow-y-auto">
        {visible.length === 0 && <div className="text-slate-500 text-xs">No albums</div>}
        {visible.map((a) => (
          <div key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.03] hover:bg-white/[0.06]">
            <ImageIcon size={12} className="text-rose-400 shrink-0" />
            <span className="text-slate-200 text-xs font-medium truncate flex-1">{a.albumName}</span>
            <span className="text-slate-500 text-xs shrink-0">{a.assetCount?.toLocaleString() ?? 0}</span>
          </div>
        ))}
      </div>
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// ReadlyCard
// ---------------------------------------------------------------------------

interface ReadlyDoc {
  id: string;
  filename: string;
  pages?: number;
  size_mb?: number;
  added?: string;
  summary?: string;
}

function ReadlyCard() {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<ReadlyDoc[]>([]);
  const [selected, setSelected] = useState<ReadlyDoc | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [query, setQuery] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await knowledgeGet("readly", "documents");
      const list: ReadlyDoc[] = Array.isArray(data?.documents) ? data.documents
        : Array.isArray(data) ? data : [];
      setDocs(list);
      setOnline(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
      setOnline(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const summarize = async (doc: ReadlyDoc) => {
    setSelected(doc); setSummary(null); setSummarizing(true);
    try {
      const r = await knowledgePost("readly", `documents/${doc.id}/summarize`, {});
      setSummary(r?.summary || r?.result || "No summary returned.");
    } catch { setSummary("Failed to summarize."); }
    setSummarizing(false);
  };

  const visible = docs.filter((d) =>
    !query || d.filename.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ConnectorCard
      title="Readly" subtitle={`${docs.length} documents`}
      icon={<BookOpen size={18} />} accentClass="border-cyan-500/30 shadow-cyan-500/10"
      online={online} loading={loading} error={error} onRefresh={fetch} port={10863}
    >
      {selected && (
        <div className="mb-3 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-cyan-300 text-xs font-medium truncate">{selected.filename}</span>
            <button onClick={() => { setSelected(null); setSummary(null); }}
              className="text-slate-600 hover:text-slate-300 text-xs ml-2 shrink-0">✕</button>
          </div>
          {summarizing ? (
            <div className="text-slate-500 text-xs animate-pulse">Summarizing…</div>
          ) : summary ? (
            <div className="text-slate-300 text-xs leading-relaxed max-h-24 overflow-y-auto">{summary}</div>
          ) : null}
        </div>
      )}

      <input
        value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter documents…"
        className="w-full mb-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
      />

      <div className="space-y-1 max-h-52 overflow-y-auto">
        {visible.length === 0 && <div className="text-slate-500 text-xs">No documents</div>}
        {visible.map((d) => (
          <div key={d.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.03] hover:bg-white/[0.06]">
            <BookMarked size={12} className="text-cyan-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 text-xs font-medium truncate">{d.filename}</div>
              <div className="text-slate-600 text-xs">
                {d.pages != null && `${d.pages}p`}
                {d.size_mb != null && ` · ${d.size_mb.toFixed(1)} MB`}
              </div>
            </div>
            <button onClick={() => summarize(d)}
              className="shrink-0 px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 text-xs transition-colors">
              Sum
            </button>
          </div>
        ))}
      </div>
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// Status strip
// ---------------------------------------------------------------------------

const WAVE4_CONNECTORS = [
  { key: "advanced-memory", label: "Memory", port: 10705 },
  { key: "notion", label: "Notion", port: 10811 },
  { key: "fastsearch", label: "Search", port: 10845 },
  { key: "immich", label: "Immich", port: 10839 },
  { key: "readly", label: "Readly", port: 10863 },
];

function StatusStrip() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    axios.get(`${BRIDGE}/home`).then((r) => {
      const c = r.data?.connectors || {};
      const result: Record<string, boolean> = {};
      for (const { key } of WAVE4_CONNECTORS) result[key] = c[key]?.online ?? false;
      setStatuses(result);
    }).catch(() => { });
  }, []);

  return (
    <div className="hidden md:flex items-center gap-2 flex-wrap">
      {WAVE4_CONNECTORS.map(({ key, label }) => (
        <span key={key}
          className={`text-xs px-2 py-0.5 rounded-full ${statuses[key] ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-slate-500"}`}>
          {label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function KnowledgeHub() {
  return (
    <div className="space-y-12">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Library size={22} className="text-indigo-400" />
            <h1 className="text-xl font-bold text-slate-100">Knowledge Hub</h1>
          </div>
          <p className="text-sm text-slate-400">Wave 4 connectors — memory, notes, search, photos, documents.</p>
        </div>
        <StatusStrip />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        <AdvancedMemoryCard />
        <NotionCard />
        <FastSearchCard />
        <ImmichCard />
        <ReadlyCard />
        {/* All waves complete — placeholder for future Wave 5 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/8 bg-white/[0.01] text-slate-700 text-xs gap-2"
          style={{ minHeight: 420 }}
        >
          <Star size={22} className="opacity-30" />
          <span>All waves complete</span>
          <span className="text-slate-800">Home · Creative · Infra · Knowledge</span>
        </motion.div>
      </div>
    </div>
  );
}
