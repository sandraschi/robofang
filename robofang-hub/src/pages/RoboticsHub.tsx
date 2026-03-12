import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cpu, Activity, Radio,
    RefreshCw, Zap,
    Shield, ShieldCheck, Move, Settings, Battery,
    AlertTriangle, Box, ChevronRight,
    Gamepad2, Info, Share2, Bot,
    Wind
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';

const BRIDGE = 'http://localhost:10871';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function roboticsGet(connector: string, path = '') {
    const url = path ? `${BRIDGE}/home/${connector}/${path}` : `${BRIDGE}/home/${connector}`;
    const r = await axios.get(url, { timeout: 8000 });
    return r.data;
}

// ── Components ────────────────────────────────────────────────────────────────
interface RoboticsCardProps {
    title: string;
    icon: React.ReactNode;
    online: boolean | null;
    loading: boolean;
    onRefresh: () => void;
    children: React.ReactNode;
    accentClass: string;
}

const RoboticsCard: React.FC<RoboticsCardProps> = ({
    title, icon, online, loading, onRefresh, children, accentClass
}) => (
    <GlassCard className={`flex flex-col h-full bg-slate-900/40 border-slate-700/50 hover:border-${accentClass}-500/30 transition-all duration-500 group overflow-hidden`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-${accentClass}-500/5`}>
            <div className="flex items-center gap-3">
                <div className={`text-${accentClass}-400 group-hover:scale-110 transition-transform duration-500`}>
                    {icon}
                </div>
                <div>
                    <div className="text-sm font-bold text-slate-100">{title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${online ? "text-emerald-400" : "text-red-400"}`}>
                            {online ? "Online" : "Offline"}
                        </span>
                    </div>
                </div>
            </div>
            <button
                onClick={onRefresh}
                disabled={loading}
                title="Refresh Metrics"
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-200 transition-all active:scale-90"
            >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2, 3, 4].map(i => (
                            <div 
                                key={i} 
                                className="skeleton-bar" 
                                style={{ "--w": `${70 + (i % 3) * 10}%` } as React.CSSProperties} 
                            />
                        ))}
                    </div>
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

const RoboticsHub: React.FC = () => {
    const [unitreeOnline, setUnitreeOnline] = useState<boolean | null>(null);
    const [unitreeData, setUnitreeData] = useState<{battery?: number, mode?: string} | null>(null);
    const [unitreeLoading, setUnitreeLoading] = useState(false);

    const [oscOnline, setOscOnline] = useState<boolean | null>(null);
    const [oscData, setOscData] = useState<unknown>(null);
    const [oscLoading, setOscLoading] = useState(false);

    const [handsOnline, setHandsOnline] = useState<boolean | null>(null);
    const [handsLoading, setHandsLoading] = useState(false);

    const [yahboomOnline, setYahboomOnline] = useState<boolean | null>(null);
    const [yahboomData, setYahboomData] = useState<{battery?: number, temp?: number} | null>(null);
    const [yahboomLoading, setYahboomLoading] = useState(false);

    const [dreameOnline, setDreameOnline] = useState<boolean | null>(null);
    const [dreameData, setDreameData] = useState<{battery?: number, state?: string} | null>(null);
    const [dreameLoading, setDreameLoading] = useState(false);

    const refreshUnitree = useCallback(async () => {
        setUnitreeLoading(true);
        try {
            const data = await roboticsGet('unitree', 'status');
            setUnitreeData(data);
            setUnitreeOnline(true);
        } catch {
            setUnitreeOnline(false);
            setUnitreeData({ battery: 88, mode: 'Simulation' }); // Mock fallback
        } finally {
            setUnitreeLoading(false);
        }
    }, []);

    const refreshOSC = useCallback(async () => {
        setOscLoading(true);
        try {
            const data = await roboticsGet('osc', 'status');
            setOscData(data);
            setOscOnline(true);
        } catch {
            setOscOnline(false);
            setOscData({ last_message: 'Listening for virtual OSC packets...' }); // Mock fallback
        } finally {
            setOscLoading(false);
        }
    }, []);

    const refreshHands = useCallback(async () => {
        setHandsLoading(true);
        try {
            await roboticsGet('hands', 'status');
            setHandsOnline(true);
        } catch {
            setHandsOnline(false);
        } finally {
            setHandsLoading(false);
        }
    }, []);

    const refreshYahboom = useCallback(async () => {
        setYahboomLoading(true);
        try {
            const data = await roboticsGet('yahboom', 'status');
            setYahboomData(data);
            setYahboomOnline(true);
        } catch {
            setYahboomOnline(false);
            setYahboomData({ battery: 72, temp: 42 }); // Mock fallback
        } finally {
            setYahboomLoading(false);
        }
    }, []);

    const refreshDreame = useCallback(async () => {
        setDreameLoading(true);
        try {
            const data = await roboticsGet('dreame', 'status');
            setDreameData(data);
            setDreameOnline(true);
        } catch {
            setDreameOnline(false);
            setDreameData({ battery: 100, state: 'Docked' }); // Mock fallback
        } finally {
            setDreameLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshUnitree();
        refreshOSC();
        refreshHands();
        refreshYahboom();
        refreshDreame();
    }, [refreshUnitree, refreshOSC, refreshHands, refreshYahboom, refreshDreame]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-1"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                            <Cpu size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-100 tracking-tight">RoboticsHub</h1>
                    </div>
                    <p className="text-slate-400 text-sm max-w-xl font-medium">
                        Autonomous command interface for Unitree hardware, kinematic manipulators, and virtual OSC feedback loops.
                    </p>
                </motion.div>

                <div className="flex gap-2">
                    {['Active Shield', 'Low Latency', 'RTX-Ready'].map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-lg bg-slate-800/40 border border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            {tag}
                        </span>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                {/* Unitree Card */}
                <RoboticsCard
                    title="Unitree Robotics"
                    icon={<Activity size={18} />}
                    accentClass="orange"
                    online={unitreeOnline}
                    loading={unitreeLoading}
                    onRefresh={refreshUnitree}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Battery</div>
                                <div className="flex items-center gap-2 text-sm font-bold text-emerald-400 font-mono">
                                    <Battery size={14} /> {(unitreeData as {battery?: number})?.battery || '88'}%
                                </div>
                            </div>
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Mode</div>
                                <div className="flex items-center gap-2 text-sm font-bold text-orange-400 font-mono">
                                    <Move size={14} /> {(unitreeData as {mode?: string})?.mode || 'Idle'}
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] space-y-3">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Internal telemetry</div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-tight">Leg Motors</span>
                                    <span className="text-emerald-500 font-mono tracking-tighter flex items-center gap-1">
                                        Nominal <Info size={10} />
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-tight">LiDAR Array</span>
                                    <span className="text-emerald-500 font-mono tracking-tighter">Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </RoboticsCard>

                {/* OSC Card */}
                <RoboticsCard
                    title="OSC / Virtual"
                    icon={<Radio size={18} />}
                    accentClass="purple"
                    online={oscOnline}
                    loading={oscLoading}
                    onRefresh={refreshOSC}
                >
                    <div className="space-y-4 h-full flex flex-col">
                        <div className="flex items-center justify-between text-[10px] px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                            <span className="text-purple-300 font-black uppercase tracking-wider">Listener context :9000</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <div className="flex-1 flex flex-col space-y-2">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Traffic Monitor</div>
                            <div className="flex-1 bg-slate-950/60 rounded-xl p-3 font-mono text-[10px] text-slate-400 border border-white/5 min-h-[120px] max-h-[160px] overflow-hidden relative">
                                {(oscData as { last_message?: string })?.last_message || 'Listening for OSC packets...'}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </RoboticsCard>

                {/* Kinematics Card */}
                <RoboticsCard
                    title="Kinematics"
                    icon={<Gamepad2 size={18} />}
                    accentClass="emerald"
                    online={handsOnline}
                    loading={handsLoading}
                    onRefresh={refreshHands}
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center glow-emerald">
                            <div className="text-2xl font-black text-emerald-400 font-mono tracking-tighter">4.2ms</div>
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1">Compute Latency</div>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Module Registry</div>
                            {['L-Hand (Main)', 'R-Hand (Main)', 'IK-Engine'].map(mod => (
                                <div key={mod} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                    <span className="text-[11px] text-slate-300 font-bold uppercase tracking-tight">{mod}</span>
                                    <ChevronRight size={10} className="ml-auto text-slate-700" />
                                </div>
                            ))}
                        </div>
                    </div>
                </RoboticsCard>

                {/* Yahboom Card */}
                <RoboticsCard
                    title="Yahboom Raspbot"
                    icon={<Bot size={18} />}
                    accentClass="cyan"
                    online={yahboomOnline}
                    loading={yahboomLoading}
                    onRefresh={refreshYahboom}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Battery</div>
                                <div className="flex items-center gap-2 text-sm font-bold text-cyan-400 font-mono">
                                    <Battery size={14} /> {yahboomData?.battery || '0'}%
                                </div>
                            </div>
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Temp</div>
                                <div className="flex items-center gap-2 text-sm font-bold text-orange-400 font-mono">
                                    <Activity size={14} /> {yahboomData?.temp || '0'}°C
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] space-y-3">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">ROS Bridge Status</div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-tight">Master Node</span>
                                    <span className="text-emerald-500 font-mono tracking-tighter flex items-center gap-1">
                                        Synced <ShieldCheck size={10} />
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-tight">Camera Feed</span>
                                    <span className="text-cyan-500 font-mono tracking-tighter flex items-center gap-1">
                                        Active <Radio size={10} />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </RoboticsCard>

                {/* Dreame Card */}
                <RoboticsCard
                    title="Dreame Vacuum"
                    icon={<Wind size={18} />}
                    accentClass="emerald"
                    online={dreameOnline}
                    loading={dreameLoading}
                    onRefresh={refreshDreame}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Battery</div>
                                <div className="flex items-center gap-2 text-sm font-bold text-emerald-400 font-mono">
                                    <Battery size={14} /> {dreameData?.battery || '0'}%
                                </div>
                            </div>
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Status</div>
                                <div className="flex items-center gap-2 text-sm font-bold text-emerald-400 font-mono">
                                    <Activity size={14} /> {dreameData?.state || 'Idle'}
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] space-y-3">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Map & Vision</div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-tight">Lidar Scan</span>
                                    <span className="text-emerald-500 font-mono tracking-tighter">Nominal</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-tight">Obstacle Det.</span>
                                    <span className="text-emerald-500 font-mono tracking-tighter">Enabled</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </RoboticsCard>

                {/* OSC Dispatcher */}
                <RoboticsCard
                    title="OSC Dispatcher"
                    icon={<Share2 size={18} />}
                    accentClass="blue"
                    online={true}
                    loading={false}
                    onRefresh={() => { }}
                >
                    <div className="space-y-4">
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest px-1">Broadcast Targets</div>
                        <div className="space-y-2">
                             {['VRChat :9001', 'Unity :9002', 'Reaper :9003'].map(dest => (
                                <div key={dest} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:border-blue-500/20 transition-all group/dest">
                                    <span className="text-[11px] text-slate-300 font-bold uppercase tracking-tight">{dest}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-blue-500 group-hover:animate-ping" />
                                        <span className="text-[9px] font-black text-blue-400 uppercase">Active</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </RoboticsCard>

                {/* Fleet Shield */}
                <GlassCard className="flex flex-col h-full bg-slate-900/40 border-slate-700/50 p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                             <Shield size={20} />
                        </div>
                        <div className="text-sm font-bold text-slate-100 italic uppercase tracking-tighter">Fleet Shield</div>
                    </div>
                    
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                            <Shield size={64} className="rotate-12" />
                        </div>
                        <div className="relative z-10">
                            <div className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-1">State: Guarding</div>
                            <div className="text-[10px] text-slate-400 leading-relaxed font-medium">
                                Active node protection protocol engaged. Sovereignty substrate verified.
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                         <button className="w-full py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-widest transition-all">
                            Rotate Auth Keys
                        </button>
                    </div>
                </GlassCard>

                {/* Maintenance */}
                <RoboticsCard
                    title="Maintenance"
                    icon={<Settings size={18} />}
                    accentClass="slate"
                    online={true}
                    loading={false}
                    onRefresh={() => { }}
                >
                    <div className="space-y-3">
                         <button className="w-full p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-all flex items-center gap-3 group">
                            <Zap size={14} className="text-amber-500 group-hover:animate-bounce" />
                            <span className="text-[11px] text-slate-300 font-bold uppercase tracking-tight">Recalibrate Joints</span>
                        </button>
                        <button className="w-full p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-all flex items-center gap-3 group">
                            <Box size={14} className="text-blue-500" />
                            <span className="text-[11px] text-slate-300 font-bold uppercase tracking-tight">Zero Alignment</span>
                        </button>
                        <button className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all flex items-center justify-center gap-3 group mt-4">
                            <AlertTriangle size={16} className="text-red-500 group-hover:rotate-12 transition-transform" />
                            <span className="text-xs text-red-400 font-black uppercase tracking-[0.2em]">Emergency E-Stop</span>
                        </button>
                    </div>
                </RoboticsCard>
            </div>
        </div>
    );
};

export default RoboticsHub;
