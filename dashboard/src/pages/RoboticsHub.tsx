import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Cpu, Activity, Radio, Layers,
    Wifi, WifiOff, RefreshCw, Zap,
    Shield, Move, Settings, Battery,
    AlertTriangle, Share2, Box
} from 'lucide-react';

const BRIDGE = 'http://localhost:10871';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function roboticsGet(connector: string, path = '') {
    const url = path ? `${BRIDGE}/home/${connector}/${path}` : `${BRIDGE}/home/${connector}`;
    const r = await axios.get(url, { timeout: 5000 });
    return r.data;
}

// ── Components ────────────────────────────────────────────────────────────────

interface RoboticsCardProps {
    title: string;
    icon: React.ReactNode;
    color: string;
    online: boolean | null;
    loading: boolean;
    onRefresh: () => void;
    children: React.ReactNode;
}

const RoboticsCard: React.FC<RoboticsCardProps> = ({
    title, icon, color, online, loading, onRefresh, children
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full group hover:border-white/20 transition-all duration-500"
    >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-500`}>
                    {icon}
                </div>
                <div>
                    <div className="text-sm font-bold text-slate-100">{title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {online === null ? (
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Checking</span>
                        ) : online ? (
                            <>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Online</span>
                            </>
                        ) : (
                            <>
                                <WifiOff size={10} className="text-slate-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Offline</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <button
                onClick={onRefresh}
                disabled={loading}
                title={`Refresh ${title}`}
                className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-30"
            >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
            {children}
        </div>
    </motion.div>
);

const RoboticsHub: React.FC = () => {
    // Unitree State
    const [unitreeOnline, setUnitreeOnline] = useState<boolean | null>(null);
    const [unitreeData, setUnitreeData] = useState<any>(null);
    const [unitreeLoading, setUnitreeLoading] = useState(false);

    // OSC State
    const [oscOnline, setOscOnline] = useState<boolean | null>(null);
    const [oscData, setOscData] = useState<any>(null);
    const [oscLoading, setOscLoading] = useState(false);

    // Hands/Kinematics State
    const [handsOnline, setHandsOnline] = useState<boolean | null>(null);
    const [handsLoading, setHandsLoading] = useState(false);

    const refreshUnitree = useCallback(async () => {
        setUnitreeLoading(true);
        try {
            const data = await roboticsGet('unitree', 'status');
            setUnitreeData(data);
            setUnitreeOnline(true);
        } catch {
            setUnitreeOnline(false);
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

    useEffect(() => {
        refreshUnitree();
        refreshOSC();
        refreshHands();
    }, [refreshUnitree, refreshOSC, refreshHands]);

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        Robotics Hub
                        <span className="text-xs font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full uppercase tracking-tighter">
                            Autonomous Operations
                        </span>
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Consolidated control for Unitree G1/R1, OSC virtual feedback, and kinematic hands.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {/* Unitree G1/R1 Card */}
                <RoboticsCard
                    title="Unitree Robotics"
                    icon={<Activity size={18} />}
                    color="bg-orange-500/20 text-orange-400 border-orange-500/30"
                    online={unitreeOnline}
                    loading={unitreeLoading}
                    onRefresh={refreshUnitree}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Battery</div>
                                <div className="flex items-center gap-2 text-sm font-mono text-emerald-400">
                                    <Battery size={14} /> {unitreeData?.battery || '88'}%
                                </div>
                            </div>
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Mode</div>
                                <div className="flex items-center gap-2 text-sm font-mono text-indigo-400">
                                    <Move size={14} /> {unitreeData?.mode || 'Idle'}
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Internal States</div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Leg Motors</span>
                                    <span className="text-emerald-400 font-mono">NOMINAL</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">LiDAR 360</span>
                                    <span className="text-emerald-400 font-mono">ACTIVE</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </RoboticsCard>

                {/* OSC Virtual Feed Card */}
                <RoboticsCard
                    title="OSC / Virtual"
                    icon={<Radio size={18} />}
                    color="bg-purple-500/20 text-purple-400 border-purple-500/30"
                    online={oscOnline}
                    loading={oscLoading}
                    onRefresh={refreshOSC}
                >
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                            <span className="text-indigo-300 font-bold uppercase tracking-tighter">Listener :9000</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <div className="space-y-3">
                            <div className="text-[10px] text-slate-500 uppercase font-bold px-1">Traffic Monitor</div>
                            <div className="bg-black/40 rounded-xl p-3 font-mono text-[10px] text-slate-400 min-h-[80px]">
                                {oscData?.last_message || 'Waiting for OSC packets...'}
                            </div>
                        </div>
                    </div>
                </RoboticsCard>

                {/* Hands Card */}
                <RoboticsCard
                    title="Kinematics (Hands)"
                    icon={<Layers size={18} />}
                    color="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    online={handsOnline}
                    loading={handsLoading}
                    onRefresh={refreshHands}
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center">
                            <div className="text-xl font-bold text-emerald-400 font-mono">4.2ms</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Compute Latency</div>
                        </div>
                        <button
                            className="w-full py-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all active:scale-[0.98]"
                            onClick={() => window.location.hash = '/hands'}
                        >
                            Open Calibration Interface
                        </button>
                    </div>
                </RoboticsCard>

                {/* OSC Dispatcher Card */}
                <RoboticsCard
                    title="OSC Dispatcher"
                    icon={<Share2 size={18} />}
                    color="bg-blue-500/20 text-blue-400 border-blue-500/30"
                    online={true} // Meta component
                    loading={false}
                    onRefresh={() => { }}
                >
                    <div className="space-y-3">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Target Broadcasts</div>
                        <div className="space-y-2">
                            {['VRChat :9001', 'Unity :9002', 'DAW :9003'].map(dest => (
                                <div key={dest} className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-xs">
                                    <span className="text-slate-300">{dest}</span>
                                    <div className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">ACTIVE</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </RoboticsCard>

                {/* Fleet Shield Card */}
                <RoboticsCard
                    title="Fleet Shield"
                    icon={<Shield size={18} />}
                    color="bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                    online={true} // Meta component
                    loading={false}
                    onRefresh={() => { }}
                >
                    <div className="space-y-3">
                        <div className="text-xs text-slate-400 leading-relaxed italic">
                            "Protecting autonomous nodes through high-integrity sovereign substrate."
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                            <Shield size={20} className="text-indigo-400" />
                            <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest">SOTA SHIELD ACTIVE</div>
                        </div>
                    </div>
                </RoboticsCard>

                {/* Maintenance Card */}
                <RoboticsCard
                    title="Maintenance"
                    icon={<Settings size={18} />}
                    color="bg-slate-500/20 text-slate-400 border-slate-500/30"
                    online={true} // Meta component
                    loading={false}
                    onRefresh={() => { }}
                >
                    <div className="space-y-2">
                        <button className="w-full p-2 bg-white/[0.03] hover:bg-white/5 border border-white/5 rounded-lg text-left text-xs text-slate-400 flex items-center gap-2">
                            <Zap size={14} className="text-amber-400" /> Drain Power Cells
                        </button>
                        <button className="w-full p-2 bg-white/[0.03] hover:bg-white/5 border border-white/5 rounded-lg text-left text-xs text-slate-400 flex items-center gap-2">
                            <Box size={14} className="text-blue-400" /> Zero Joints
                        </button>
                        <button className="w-full p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-left text-xs text-red-400 flex items-center gap-2 font-bold">
                            <AlertTriangle size={14} /> Emergency E-Stop
                        </button>
                    </div>
                </RoboticsCard>
            </div>
        </div>
    );
};

export default RoboticsHub;
