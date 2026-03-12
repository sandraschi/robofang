import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    Info,
    Monitor
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BRIDGE = "http://localhost:10871";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function virtualGet(connector: string, path: string) {
    const r = await axios.get(`${BRIDGE}/home/${connector}/${path}`, { timeout: 8000 });
    return r.data;
}

// ---------------------------------------------------------------------------
// Shared Component: ConnectorCard
// ---------------------------------------------------------------------------
interface ConnectorCardProps {
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    accentClass: string;
    online: boolean;
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
    children: React.ReactNode;
    port?: number;
}

const ConnectorCard: React.FC<ConnectorCardProps> = ({
    title, subtitle, icon, accentClass, online, loading, error, onRefresh, children, port
}) => (
    <Card className="flex flex-col h-full bg-slate-950/40 border-slate-800 hover:border-slate-700 transition-all duration-500 group overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-slate-900/20 space-y-0">
            <div className="flex items-center gap-3">
                <div className={`text-${accentClass}-400 group-hover:scale-110 transition-transform duration-500`}>
                    {icon}
                </div>
                <div>
                    <CardTitle className="text-sm font-bold text-slate-100">{title}</CardTitle>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${online ? "text-emerald-400" : "text-red-400"}`}>
                            {online ? "Connected" : "Offline"}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {port && <span className="text-[9px] font-mono text-slate-600 tracking-tighter">:{port}</span>}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRefresh}
                    disabled={loading}
                    title="Refresh Substrate"
                    className="h-8 w-8 text-slate-500 hover:text-white transition-all"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </Button>
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-5 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
                {error ? (
                    <div className="text-[10px] text-red-400 bg-red-500/5 p-3 rounded-xl border border-red-500/10 italic font-mono uppercase tracking-tight">
                        {error}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </CardContent>
    </Card>
);

// ---------------------------------------------------------------------------
// Pipeline Visualization
// ---------------------------------------------------------------------------
function PipelineVisualization() {
    return (
        <Card className="p-8 mb-10 overflow-hidden relative bg-slate-900/40 border-slate-800">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Workflow size={120} />
            </div>

            <div className="flex items-center justify-between max-w-5xl mx-auto relative px-4">
                {/* Pipeline Steps */}
                {[
                    { icon: Sparkles, label: 'VRoid', color: 'pink', title: 'VRoid Studio: Sculpting & Rigging' },
                    { icon: Box, label: 'Blender', color: 'orange', title: 'Blender: Functional Refinement' },
                    { icon: Layers, label: 'Unity', color: 'blue', title: 'Unity 3D: Bridge & Shaders' },
                    { icon: Share2, label: 'Deploy', color: 'indigo', title: 'Resonite / VRChat: Social Deployment' }
                ].map((s, idx, arr) => {
                    const step = s as { icon: any, label: string, color: string, title: string };
                    return (
                        <div key={idx} className="flex items-center gap-4 flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-3 group cursor-help" title={step.title}>
                                <div className={`w-16 h-16 rounded-2xl bg-${step.color}-500/10 border border-${step.color}-500/20 flex items-center justify-center text-${step.color}-400 group-hover:scale-110 shadow-lg group-hover:shadow-${step.color}-500/5 transition-all duration-500`}>
                                    <step.icon size={28} />
                                </div>
                                <span className={`text-[10px] font-black text-${step.color}-500 uppercase tracking-[0.2em]`}>{step.label}</span>
                            </div>
                            {idx < arr.length - 1 && (
                                <div className="flex-1 flex items-center justify-center">
                                    <ChevronRight className="text-slate-700" size={24} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 flex justify-center">
                <Badge variant="glass" className="bg-indigo-500/5 border border-indigo-500/10 text-slate-400 flex items-center gap-2 font-bold uppercase tracking-wider px-4 py-1.5 h-auto">
                    <CloudLightning size={14} className="text-amber-500 animate-pulse" />
                    <span>Splat Ingestion: WorldLabs Integration Active</span>
                </Badge>
            </div>
        </Card>
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
                <Badge key={key} variant="glass" className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/40 border-white/5">
                    <div className={`w-1.5 h-1.5 rounded-full ${statuses[key] ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${statuses[key] ? "text-emerald-400" : "text-slate-500"}`}>
                        {label}
                    </span>
                </Badge>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
const VirtualHub: React.FC = () => {
    const [vrStatus, setVrStatus] = useState<unknown>(null);
    const [vrLoading, setVrLoading] = useState(false);
    const [vrOnline, setVrOnline] = useState(false);

    const fetchVRC = useCallback(async () => {
        setVrLoading(true);
        try {
            const data = await virtualGet("vrchat", "status");
            setVrStatus(data);
            setVrOnline(true);
        } catch {
            setVrOnline(false);
        } finally {
            setVrLoading(false);
        }
    }, []);

    useEffect(() => { fetchVRC(); }, [fetchVRC]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-1"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                             <Monitor size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-100 tracking-tighter">VirtualHub</h1>
                    </div>
                    <p className="text-slate-400 text-sm max-w-xl font-medium">
                        Wave 5 Spatial Pipeline control. Avatar creation, Gaussian splatting ingestion, and social VR social deployment logic.
                    </p>
                </motion.div>
                <StatusStrip />
            </header>

            <PipelineVisualization />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                {/* VRChat Card */}
                <ConnectorCard
                    title="VRChat"
                    subtitle={(vrStatus as any)?.world_name || "Social Substrate"}
                    icon={<Globe size={18} />}
                    accentClass="blue"
                    online={vrOnline}
                    loading={vrLoading}
                    error={null}
                    onRefresh={fetchVRC}
                    port={10712}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 font-mono">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Players</div>
                                <div className="text-lg font-black text-blue-400 tracking-tighter">
                                    {(vrStatus as any)?.player_count ?? "—"}
                                </div>
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter uppercase">Substrate</div>
                                <div className="text-xs font-bold text-slate-300 truncate mt-1">
                                    {(vrStatus as any)?.world_name || "Unknown"}
                                </div>
                            </div>
                        </div>
                        {((vrStatus as any)||{}).avatar_name && (
                            <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
                                <div className="text-[9px] text-blue-500 uppercase font-bold tracking-[0.2em]">Active Identity</div>
                                <div className="text-xs font-mono text-slate-300 font-bold">{((vrStatus as any)||{}).avatar_name}</div>
                            </div>
                        )}
                        <Button 
                            variant="glass"
                            size="sm"
                            className="w-full py-5 text-blue-400 border-blue-500/20 text-[10px] font-bold uppercase tracking-widest"
                        >
                            Force OSC Sync
                        </Button>
                    </div>
                </ConnectorCard>

                {/* Resonite Card */}
                <ConnectorCard
                    title="Resonite"
                    subtitle="Computational Engine"
                    icon={<Workflow size={18} />}
                    accentClass="purple"
                    online={true} 
                    loading={false}
                    error={null}
                    onRefresh={() => {}}
                    port={10766}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Session</div>
                                <div className="text-xs font-bold text-purple-400 truncate mt-1 font-mono uppercase tracking-tighter">SANDRA_DEV_LAB</div>
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 font-mono">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Uptime</div>
                                <div className="text-xs font-bold text-slate-300 mt-1 uppercase">04:12:33</div>
                            </div>
                        </div>
                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between">
                            <span className="text-[10px] text-purple-300 font-black uppercase tracking-widest">Logic Flux</span>
                            <Badge variant="glass" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono font-bold tracking-widest">STABLE</Badge>
                        </div>
                        <div className="text-[10px] text-slate-500 px-1 leading-relaxed italic font-medium">
                            Node verified on Alsergrund local cluster. Spatial sync operational.
                        </div>
                    </div>
                </ConnectorCard>

                {/* WorldLabs Card */}
                <ConnectorCard
                    title="WorldLabs"
                    subtitle="Gaussian Splatting"
                    icon={<BoxSelect size={18} />}
                    accentClass="indigo"
                    online={true}
                    loading={false}
                    error={null}
                    onRefresh={() => {}}
                >
                    <div className="space-y-4">
                        <div className="bg-slate-950/40 rounded-xl p-4 border border-white/5 space-y-3">
                            <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Ingestion History</div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                    <span className="text-slate-300 underline decoration-slate-800 underline-offset-4">alsergrund_01</span>
                                    <Badge variant="glass" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono tracking-tighter">COMPILED</Badge>
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-bold opacity-50">
                                    <span className="text-slate-300">vienna_district_9</span>
                                    <Badge variant="glass" className="bg-slate-500/10 text-slate-500 border-white/5 font-mono tracking-tighter">ENQUEUED</Badge>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] group hover:border-indigo-500/30 transition-all cursor-pointer">
                            <Terminal size={14} className="text-indigo-400" />
                            <span className="text-[10px] text-slate-400 font-mono truncate tracking-tight">splat_convert --target-vram-24g</span>
                        </div>
                    </div>
                </ConnectorCard>

                 {/* Unity Bridge */}
                 <ConnectorCard 
                    title="Unity Bridge" 
                    subtitle="Spatial Logic" 
                    icon={<Layers size={18} />} 
                    accentClass="cyan" 
                    online={false} 
                    loading={false} 
                    error={null} 
                    onRefresh={() => { }} 
                    port={10834}
                >
                    <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-4">
                        <div className="p-4 rounded-full bg-slate-900/40 border border-white/[0.05]">
                             <CloudLightning size={32} className="opacity-10 translate-y-1" />
                        </div>
                        <span className="text-[10px] font-black tracking-widest uppercase opacity-40">Awaiting Substrate Connect</span>
                         <Button variant="glass" size="sm" className="px-6 text-[9px] font-bold uppercase tracking-widest hover:text-cyan-400">
                            Initialize Bridge
                         </Button>
                    </div>
                </ConnectorCard>

                {/* VRoid Versioning */}
                <ConnectorCard 
                    title="VRoid Depot" 
                    subtitle="Identity Versioning" 
                    icon={<Sparkles size={18} />} 
                    accentClass="pink" 
                    online={true} 
                    loading={false} 
                    error={null} 
                    onRefresh={() => { }} 
                >
                    <div className="space-y-3">
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest px-1">Registry</div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-pink-500/5 rounded-xl border border-pink-500/20 group hover:bg-pink-500/10 transition-all cursor-pointer">
                                <span className="text-[11px] font-bold text-pink-300">sandra_v13_final.vrm</span>
                                <span className="text-[9px] font-mono text-slate-500">2 min ago</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] opacity-50">
                                <span className="text-[11px] font-bold text-slate-400">sandra_v12_vienna.vrm</span>
                                <span className="text-[9px] font-mono text-slate-600">6h ago</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 px-1">
                            <Info size={12} className="text-slate-600" />
                            <span className="text-[10px] text-slate-600 font-medium tracking-tight">Auto-sync with Blender pipeline enabled.</span>
                        </div>
                    </div>
                </ConnectorCard>

                 {/* Identity Shield */}
                 <Card className="flex flex-col h-full bg-slate-950/40 border-slate-800 p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                             <Monitor size={20} />
                        </div>
                        <CardTitle className="text-sm font-bold text-slate-100 italic uppercase tracking-tighter">Identity Shield</CardTitle>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center space-y-4">
                        <div className="text-xs text-slate-400 leading-relaxed font-medium text-center px-2">
                            Virtual assets are cryptographically signed. Sovereign identity maintained across VRChat/Resonite nodes.
                        </div>
                        <div className="p-6 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex flex-col items-center gap-2">
                             <div className="text-3xl font-black text-cyan-400 font-mono tracking-tighter">100%</div>
                             <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] pt-1">Integrity Verified</div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default VirtualHub;
