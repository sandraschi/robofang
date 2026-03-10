/**
 * VirtualHub — Wave 5 Avatar & Spatial Pipeline
 * Connectors: vrchat, resonite, unity, worldlabs, vroid
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
    Globe,
    Box,
    Layers,
    RefreshCw,
    Share2,
    BoxSelect,
    CloudLightning,
    Workflow,
    Sparkles,
    ChevronRight,
    Terminal,
} from "lucide-react";

const BRIDGE = "http://localhost:10871";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function virtualGet(connector: string, path: string) {
    const r = await axios.get(`${BRIDGE}/home/${connector}/${path}`, { timeout: 8000 });
    return r.data;
}

// ---------------------------------------------------------------------------
// Shared Component: ConnectorCard (Simplified for Virtual Hub)
// ---------------------------------------------------------------------------

interface ConnectorCardProps {
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    accentColor: "blue" | "purple" | "indigo" | "pink" | "cyan";
    online: boolean;
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
    children: React.ReactNode;
    port?: number;
}

const ACCENTS = {
    blue: { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400" },
    purple: { border: "border-purple-500/30", bg: "bg-purple-500/10", text: "text-purple-400" },
    indigo: { border: "border-indigo-500/30", bg: "bg-indigo-500/10", text: "text-indigo-400" },
    pink: { border: "border-pink-500/30", bg: "bg-pink-500/10", text: "text-pink-400" },
    cyan: { border: "border-cyan-500/30", bg: "bg-cyan-500/10", text: "text-cyan-400" },
};

function ConnectorCard({
    title, subtitle, icon, accentColor, online, loading, error, onRefresh, children, port
}: ConnectorCardProps) {
    const ac = ACCENTS[accentColor];

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative group bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col h-full hover:border-white/20 transition-all duration-500 overflow-hidden`}
            style={{ minHeight: 320 }}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${ac.bg} ${ac.text} group-hover:scale-110 transition-transform duration-500`}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-100">{title}</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none mt-1">{subtitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {port && <span className="text-[9px] font-mono text-slate-600">:{port}</span>}
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        title={`Refresh ${title} status`}
                        className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="flex-1">
                {error ? (
                    <div className="text-[10px] text-red-400 bg-red-500/5 p-2 rounded border border-red-500/10">{error}</div>
                ) : children}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between font-mono">
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-500 shadow-[0_0_8px_theme(colors.emerald.500)]" : "bg-slate-600"}`} />
                    <span className={`text-[9px] uppercase tracking-tighter ${online ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                        {online ? "Connected" : "Offline"}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

// ---------------------------------------------------------------------------
// Avatar Pipeline Components
// ---------------------------------------------------------------------------

function PipelineVisualization() {
    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 mb-10 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Workflow size={120} />
            </div>

            <div className="flex items-center justify-between max-w-4xl mx-auto relative">
                {/* Pipeline Steps */}
                <div className="flex flex-col items-center gap-2 group cursor-help" title="VRoid Studio: Sculpting & Rigging">
                    <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-110 shadow-lg shadow-pink-500/5 transition-transform">
                        <Sparkles size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-pink-500/80 uppercase tracking-widest">VRoid</span>
                </div>

                <ChevronRight className="text-slate-700" size={20} />

                <div className="flex flex-col items-center gap-2 group cursor-help" title="Blender: Functional Refinement">
                    <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-110 shadow-lg shadow-orange-500/5 transition-transform">
                        <Box size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-orange-500/80 uppercase tracking-widest">Blender</span>
                </div>

                <ChevronRight className="text-slate-700" size={20} />

                <div className="flex flex-col items-center gap-2 group cursor-help" title="Unity 3D: Bridge & Shaders">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 shadow-lg shadow-blue-500/5 transition-transform">
                        <Layers size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-blue-500/80 uppercase tracking-widest">Unity</span>
                </div>

                <ChevronRight className="text-slate-700" size={20} />

                <div className="flex flex-col items-center gap-2 group cursor-help" title="Resonite / VRChat: Social Deployment">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 shadow-lg shadow-indigo-500/5 transition-transform">
                        <Share2 size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-500/80 uppercase tracking-widest">Deploy</span>
                </div>
            </div>

            <div className="mt-8 flex justify-center">
                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-slate-500 flex items-center gap-2">
                    <CloudLightning size={12} className="text-amber-500" />
                    <span>Splat Ingestion: WorldLabs Integration Active</span>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Specific Cards
// ---------------------------------------------------------------------------

function ResoniteCard() {
    const [online, setOnline] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(() => {
        setLoading(true);
        setTimeout(() => {
            setOnline(true);
            setLoading(false);
        }, 1000);
    }, []);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        const timer = setTimeout(() => {
            if (isMounted) {
                setOnline(true);
                setLoading(false);
            }
        }, 800);
        return () => { isMounted = false; clearTimeout(timer); };
    }, []);

    return (
        <ConnectorCard
            title="Resonite" subtitle="Spatial Social Engine" icon={<Workflow size={18} />}
            accentColor="purple" online={online} loading={loading} error={null} onRefresh={fetch} port={10766}
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                        <div className="text-slate-400 text-[10px]">Session</div>
                        <div className="text-slate-100 text-xs font-mono truncate">SANDRA_DEV_LAB</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                        <div className="text-slate-400 text-[10px]">UPTIME</div>
                        <div className="text-slate-100 text-xs font-mono">04:12:33</div>
                    </div>
                </div>
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">OSC Bridge</span>
                    <span className="text-[10px] font-mono text-emerald-400">SYNCED</span>
                </div>
                <div className="text-[10px] text-slate-500 px-1 leading-relaxed italic">
                    Managing world state and avatar logic for social VR deployment.
                </div>
            </div>
        </ConnectorCard>
    );
}

function WorldLabsCard() {
    return (
        <ConnectorCard
            title="WorldLabs" subtitle="Gaussian Splatting" icon={<BoxSelect size={18} />}
            accentColor="indigo" online={true} loading={false} error={null} onRefresh={() => { }}
        >
            <div className="space-y-3">
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Recent Ingestions</div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">alsergrund_base_01</span>
                            <span className="text-emerald-400 font-mono text-[9px]">COMPLETE</span>
                        </div>
                        <div className="flex items-center justify-between text-xs opacity-50">
                            <span className="text-slate-300">vienna_ninth_district</span>
                            <span className="text-slate-500 font-mono text-[9px]">CACHED</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                    <Terminal size={14} className="text-slate-500" />
                    <span className="text-[10px] text-slate-400 font-mono">splat_convert --input-raw --target-resonite</span>
                </div>
            </div>
        </ConnectorCard>
    );
}

interface VRChatStatus { world_name?: string; player_count?: number; avatar_name?: string; }

function VRChatCard() {
    const [online, setOnline] = useState(false);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<VRChatStatus | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const data = await virtualGet("vrchat", "status");
            setStatus(data);
            setOnline(true);
        } catch {
            setOnline(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <ConnectorCard
            title="VRChat" subtitle={status?.world_name || "Social VR"} icon={<Globe size={18} />}
            accentColor="blue" online={online} loading={loading} error={null} onRefresh={fetch} port={10712}
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded-lg p-2">
                        <div className="text-slate-400 text-xs">World</div>
                        <div className="text-slate-100 text-xs font-semibold truncate">{status?.world_name || "—"}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                        <div className="text-slate-400 text-xs">Players</div>
                        <div className="text-slate-100 font-semibold">{status?.player_count ?? "—"}</div>
                    </div>
                </div>
                {status?.avatar_name && (
                    <div className="p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                        <div className="text-slate-400 text-[10px] mb-1 uppercase tracking-widest">Active Avatar</div>
                        <div className="text-slate-100 text-xs font-mono text-indigo-300">{status.avatar_name}</div>
                    </div>
                )}
            </div>
        </ConnectorCard>
    );
}

// ---------------------------------------------------------------------------
// Page Status Strip
// ---------------------------------------------------------------------------

const WAVE5_CONNECTORS = [
    { key: "vrchat", label: "VRChat", port: 10712 },
    { key: "resonite", label: "Resonite", port: 10766 },
    { key: "unity", label: "Unity3D", port: 10834 },
    { key: "worldlabs", label: "WorldLabs", port: 10922 },
];

function StatusStrip() {
    const [statuses, setStatuses] = useState<Record<string, boolean>>({});

    useEffect(() => {
        axios.get(`${BRIDGE}/home`).then((r) => {
            const c = r.data?.connectors || {};
            const result: Record<string, boolean> = {};
            for (const { key } of WAVE5_CONNECTORS) result[key] = c[key]?.online ?? false;
            setStatuses(result);
        }).catch(() => { });
    }, []);

    return (
        <div className="hidden md:flex items-center gap-2 flex-wrap">
            {WAVE5_CONNECTORS.map(({ key, label }) => (
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

export default function VirtualHub() {
    return (
        <div className="space-y-12">
            <header className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Workflow size={22} className="text-pink-400" />
                        <h1 className="text-xl font-bold text-slate-100">Virtual Hub</h1>
                    </div>
                    <p className="text-sm text-slate-400">Wave 5 connectors — avatar creation, splat ingestion, and social VR pipelines.</p>
                </div>
                <StatusStrip />
            </header>

            <PipelineVisualization />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                <VRChatCard />
                <ResoniteCard />
                <WorldLabsCard />

                {/* Placeholder for Unity Bridge */}
                <ConnectorCard title="Unity Bridge" subtitle="Shader & OSC Management" icon={<Layers size={18} />} accentColor="cyan" online={false} loading={false} error={null} onRefresh={() => { }} port={10834}>
                    <div className="flex flex-col items-center justify-center h-24 text-slate-600 gap-2">
                        <CloudLightning size={24} className="opacity-20" />
                        <span className="text-[10px] font-mono tracking-widest uppercase opacity-40">Ready for connection</span>
                    </div>
                </ConnectorCard>

                {/* Placeholder for VRoid Versioning */}
                <ConnectorCard title="VRoid Export" subtitle="Model Versioning" icon={<Sparkles size={18} />} accentColor="pink" online={true} loading={false} error={null} onRefresh={() => { }} >
                    <div className="text-slate-500 text-[10px] space-y-2">
                        <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5">
                            <span>sandra_v13_final.vrm</span>
                            <span className="text-slate-400">2 min ago</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded border border-white/5 opacity-50">
                            <span>sandra_v12_vienna.vrm</span>
                            <span className="text-slate-600">6h ago</span>
                        </div>
                    </div>
                </ConnectorCard>
            </div>
        </div>
    );
}
