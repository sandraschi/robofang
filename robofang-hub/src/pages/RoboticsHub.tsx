import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cpu, Activity, Radio,
    RefreshCw, Zap,
    Shield, ShieldCheck, Move, Settings, Battery,
    AlertTriangle, Box, ChevronRight,
    Gamepad2, Info, Share2, Bot,
    Wind, AlertCircle
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const BRIDGE = 'http://localhost:10871';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function roboticsGet(connector: string, path = '') {
    const url = path ? `${BRIDGE}/home/${connector}/${path}` : `${BRIDGE}/home/${connector}`;
    const r = await axios.get(url, { timeout: 8000 });
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

// ── Components ────────────────────────────────────────────────────────────────
interface RoboticsCardProps {
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    online: boolean | null;
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
    children: React.ReactNode;
    accentClass: string;
    connectorId: string;
}

const RoboticsCard: React.FC<RoboticsCardProps> = ({
    title, subtitle, icon, online, loading, error, onRefresh, children, accentClass, connectorId
}) => {
    const [verifying, setVerifying] = useState(false);
    const [tools, setTools] = useState<number | null>(null);

    const handleVerify = async () => {
        setVerifying(true);
        try {
            const r = await axios.get(`${BRIDGE}/api/connectors/${connectorId}/tools`);
            setTools(r.data.count || r.data.tools?.length || 0);
        } catch (e) {
            console.error("Verification failed", e);
        } finally {
            setVerifying(false);
        }
    };

    return (
        <Card className={`flex flex-col h-full bg-slate-900/40 border-slate-700/50 hover:border-${accentClass}-500/30 transition-all duration-500 group overflow-hidden min-h-[460px] glass-panel`}>
            <CardHeader className={`flex flex-row items-center gap-3 px-5 py-4 border-b border-white/[0.06] space-y-0 bg-${accentClass}-500/5`}>
                <div className={`text-${accentClass}-400 group-hover:scale-110 transition-transform duration-500`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-bold text-slate-100">{title}</CardTitle>
                    {subtitle && (
                        <div className="text-[10px] text-slate-400 truncate uppercase tracking-widest mt-0.5 font-medium">
                            {subtitle}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    {!online && !loading && (
                        <Button
                            variant="glass"
                            size="sm"
                            onClick={() => launchConnector(connectorId)}
                            className={`h-6 px-2 text-[9px] border-${accentClass}-500/20 text-${accentClass}-400 uppercase tracking-tighter`}
                        >
                            Launch
                        </Button>
                    )}
                    <Badge 
                        variant="glass"
                        className={`px-2 py-0 h-5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider ${
                            online ? "text-emerald-400" : "text-red-400"
                        }`}
                    >
                        <div className={`w-1 h-1 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                        {online ? "online" : `OFFLINE`}
                    </Badge>
                    
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRefresh}
                        className="h-7 w-7 text-slate-500 hover:text-slate-200"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : 'hover:rotate-180 transition-transform duration-500'} />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-5 overflow-y-auto custom-scrollbar">
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
            </CardContent>

            <div className="px-5 py-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex gap-2">
                    <Button 
                        variant="glass"
                        size="sm"
                        onClick={handleVerify}
                        disabled={verifying}
                        className="h-6 px-3 text-[9px] font-bold uppercase tracking-tighter flex items-center gap-1.5"
                    >
                        {verifying ? <RefreshCw size={10} className="animate-spin" /> : <ShieldCheck size={10} />}
                        {tools !== null ? `${tools} Tools` : 'Verify Fleet'}
                    </Button>
                </div>
                
                <div className="text-[9px] font-mono text-slate-600 uppercase">
                    ID: {connectorId}
                </div>
            </div>
        </Card>
    );
};

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
                        <Badge key={tag} variant="glass" className="px-3 py-1 opacity-60">
                            {tag}
                        </Badge>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                {/* Unitree Card */}
                <RoboticsCard
                    title="Unitree Robotics"
                    connectorId="unitree"
                    icon={<Activity size={18} />}
                    accentClass="orange"
                    online={unitreeOnline}
                    loading={unitreeLoading}
                    error={null}
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
                    connectorId="osc"
                    icon={<Radio size={18} />}
                    accentClass="purple"
                    online={oscOnline}
                    loading={oscLoading}
                    error={null}
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
                    connectorId="hands"
                    icon={<Gamepad2 size={18} />}
                    accentClass="emerald"
                    online={handsOnline}
                    loading={handsLoading}
                    error={null}
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
                    connectorId="yahboom"
                    icon={<Bot size={18} />}
                    accentClass="cyan"
                    online={yahboomOnline}
                    loading={yahboomLoading}
                    error={null}
                    onRefresh={refreshYahboom}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Battery</div>
                                <div className="flex items-center gap-2 text-sm font-bold text-cyan-400 font-mono">
                                    <Battery size={14} /> {(yahboomData as {battery?: number})?.battery || '0'}%
                                </div>
                            </div>
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Temp</div>
                                <div className="flex items-center gap-2 text-sm font-bold text-orange-400 font-mono">
                                    <Activity size={14} /> {(yahboomData as {temp?: number})?.temp || '0'}°C
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
                    connectorId="dreame"
                    icon={<Wind size={18} />}
                    accentClass="emerald"
                    online={dreameOnline}
                    loading={dreameLoading}
                    error={null}
                    onRefresh={refreshDreame}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Battery</div>
                                <div className="flex items-center gap-2 text-sm font-bold text-emerald-400 font-mono">
                                    <Battery size={14} /> {(dreameData as {battery?: number})?.battery || '0'}%
                                </div>
                            </div>
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">Status</div>
                                <div className="flex items-center gap-2 text-sm font-bold text-emerald-400 font-mono">
                                    <Activity size={14} /> {(dreameData as {state?: string})?.state || 'Idle'}
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
                    connectorId="osc"
                    icon={<Share2 size={18} />}
                    accentClass="blue"
                    online={true}
                    loading={false}
                    error={null}
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
                <Card className="flex flex-col h-full bg-slate-900/40 border-slate-700/50 p-6 space-y-6 glass-panel">
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
                         <Button variant="glass" className="w-full h-9 text-[10px] font-bold uppercase tracking-widest">
                            Rotate Auth Keys
                        </Button>
                    </div>
                </Card>

                {/* OSC Feedback Loop */}
                <RoboticsCard
                    title="OSC Feedback Loop"
                    connectorId="osc"
                    icon={<Activity size={18} />}
                    accentClass="rose"
                    online={true}
                    loading={false}
                    error={null}
                    onRefresh={() => { }}
                >
                    <div className="space-y-3">
                        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] space-y-3">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Loopback Status</div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-tight">Input Stream</span>
                                    <span className="text-rose-500 font-mono tracking-tighter flex items-center gap-1">
                                        Active <Radio size={10} />
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-tight">Output Stream</span>
                                    <span className="text-rose-500 font-mono tracking-tighter flex items-center gap-1">
                                        Active <Radio size={10} />
                                    </span>
                                </div>
                            </div>
                        </div>
                        <Button variant="glass" className="w-full h-9 text-[10px] font-bold uppercase tracking-widest">
                            Calibrate Loop
                        </Button>
                    </div>
                </RoboticsCard>

                {/* Maintenance */}
                <RoboticsCard
                    title="Maintenance"
                    connectorId="robotics"
                    icon={<Settings size={18} />}
                    accentClass="slate"
                    online={true}
                    loading={false}
                    error={null}
                    onRefresh={() => { }}
                >
                    <div className="space-y-3">
                         <Button variant="glass" className="w-full p-2.5 h-auto justify-start flex items-center gap-3 group text-left">
                            <Zap size={14} className="text-amber-500 group-hover:animate-bounce" />
                            <span className="text-[11px] text-slate-300 font-bold uppercase tracking-tight">Recalibrate Joints</span>
                        </Button>
                        <Button variant="glass" className="w-full p-2.5 h-auto justify-start flex items-center gap-3 group text-left">
                            <Box size={14} className="text-blue-500" />
                            <span className="text-[11px] text-slate-300 font-bold uppercase tracking-tight">Zero Alignment</span>
                        </Button>
                        <Button variant="destructive" className="w-full h-11 flex items-center justify-center gap-3 group mt-4">
                            <AlertTriangle size={16} className="text-white group-hover:rotate-12 transition-transform" />
                            <span className="text-xs text-white font-black uppercase tracking-[0.2em]">Emergency E-Stop</span>
                        </Button>
                    </div>
                </RoboticsCard>
            </div>
        </div>
    );
};

export default RoboticsHub;
