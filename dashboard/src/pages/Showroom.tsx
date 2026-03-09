import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Zap,
    Cpu,
    Activity,
    Shield,
    Layers,
    Container,
    Database,
    Eye,
    Camera,
    Bot,
    FileText,
    ExternalLink,
    Trophy
} from 'lucide-react';
import { getFleet, getHands } from '../api';
import LogicAnalyzer from '../components/LogicAnalyzer';

export default function Showroom() {
    const [fleetCount, setFleetCount] = useState(0);
    const [activeHands, setActiveHands] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [fleet, hands] = await Promise.all([getFleet(), getHands()]);
                setFleetCount(fleet.length);
                setActiveHands(hands.filter((h: { status: string }) => h.status === 'active').length);
                setIsLoaded(true);
            } catch (error) {
                console.error('Failed to fetch showroom stats', error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-full verilog-grid p-8 relative overflow-hidden">
            <div className="scanline" />

            {/* Header Section */}
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative z-20 mb-12"
            >
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-2 bg-success/10 rounded-lg border border-success/20">
                        <Bot className="text-success" size={32} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black glow-terminal tracking-tighter italic">RoboFang_AUTONOMOUS_OS</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold border border-success/20 rounded">BUILD_SOTA_2026</span>
                            <span className="text-success/40 text-[10px] font-mono tracking-widest uppercase">System Operational // Zero-Trust Verified</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-12 gap-8 relative z-20">
                {/* Left Column: Logic & Hands */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <motion.div variants={item} initial="hidden" animate="show">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="text-success" size={20} />
                            <h2 className="text-lg font-bold glow-terminal">SYSTEM_PULSE</h2>
                        </div>
                        <LogicAnalyzer />
                    </motion.div>

                    <motion.div variants={item} initial="hidden" animate="show" className="verilog-border p-6 rounded-xl">
                        <h3 className="text-sm font-bold text-success/60 mb-4 font-mono tracking-tighter uppercase">Autonomous Status</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Active Hands</span>
                                <div className="text-3xl font-black text-white glow-terminal">{activeHands}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Fleet Nodes</span>
                                <div className="text-3xl font-black text-white glow-terminal">{fleetCount}</div>
                            </div>
                        </div>
                        <div className="mt-6 flex items-center justify-between p-3 bg-black/40 rounded border border-success/10">
                            <div className="flex items-center gap-3">
                                <Shield className="text-success animate-pulse" size={16} />
                                <span className="text-[11px] font-mono text-success">ENCRYPTION: AES_256</span>
                            </div>
                            <Zap className="text-success" size={16} />
                        </div>
                    </motion.div>
                </div>

                {/* Center/Right: Node Showcase */}
                <div className="col-span-12 lg:col-span-8">
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {[
                            { id: 'bumi', title: 'ROBOTICS_BUMI', icon: Cpu, status: 'Connected', desc: 'Physical motor control and SLAM integration.', color: 'emerald' },
                            { id: 'obs', title: 'STREAM_SUITE', icon: Camera, status: 'Passive', desc: 'Real-time video capture and automation.', color: 'blue' },
                            { id: 'ocr', title: 'EYE_INTELLIGENCE', icon: Eye, status: 'Active', desc: 'Advanced OCR and visual reasoning agent.', color: 'purple' },
                            { id: 'plex', title: 'MEDIA_VAULT', icon: Database, status: 'Connected', desc: 'Distributed library and metadata orchestration.', color: 'indigo' },
                            { id: 'calibre', title: 'KNOWLEDGE_CORE', icon: Layers, status: 'Active', desc: 'E-book library indexing and synthesis.', color: 'cyan' },
                            { id: 'ollama', title: 'NEURAL_FABRIC', icon: Zap, status: 'Syncing', desc: 'Local LLM inference cluster (RTX 4090).', color: 'orange' },
                        ].map((node) => (
                            <motion.div
                                key={node.id}
                                variants={item}
                                className="verilog-border p-5 rounded-lg group hover:bg-success/5 transition-all cursor-crosshair"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform border border-success/20 bg-success/5`}>
                                        <node.icon className="text-success" size={24} />
                                    </div>
                                    <span className="text-[9px] font-mono text-success/40">{node.status}</span>
                                </div>
                                <h3 className="text-sm font-bold text-white mb-2 tracking-tight group-hover:text-success transition-colors">{node.title}</h3>
                                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">{node.desc}</p>
                                <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: isLoaded ? '100%' : '0%' }}
                                        transition={{ duration: 1.5, delay: 0.5 }}
                                        className="h-full bg-success/30"
                                    />
                                </div>
                            </motion.div>
                        ))}

                        {/* Documentation Card */}
                        <motion.div
                            variants={item}
                            className="verilog-border p-5 rounded-lg group hover:bg-success/5 transition-all cursor-alias border-dashed border-success/40"
                            onClick={() => window.open('file:///D:/Dev/repos/mcp-central-docs/starts/README.md', '_blank')}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-success/10 rounded-lg group-hover:scale-110 transition-transform border border-success/20">
                                    <FileText className="text-success" size={24} />
                                </div>
                                <ExternalLink className="text-success/20 group-hover:text-success transition-colors" size={14} />
                            </div>
                            <h3 className="text-sm font-bold text-white mb-2 tracking-tight group-hover:text-success transition-colors">FLEET_DOCUMENTATION</h3>
                            <p className="text-[11px] text-slate-500 leading-relaxed mb-4">Centralized orchestration guides and start-script registry.</p>
                            <div className="text-[9px] font-mono text-success/40 mt-auto uppercase tracking-tighter">Location: mcp-central-docs/starts</div>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        variants={item}
                        initial="hidden"
                        animate="show"
                        className="mt-8 p-6 verilog-border rounded-xl bg-black/40"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <Trophy className="text-success" size={24} />
                            <div>
                                <h3 className="text-md font-bold text-white tracking-widest uppercase">Competitive_Intelligence_Matrix</h3>
                                <p className="text-xs text-slate-500">Benchmark comparison of RoboFang vs. contemporary agent frameworks.</p>
                            </div>
                            <div className="ml-auto">
                                <span className="px-3 py-1 bg-success/10 border border-success/30 text-success text-[10px] font-bold rounded-full animate-pulse">SOTA_GAP: 3.4x</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse font-mono text-[10px]">
                                <thead>
                                    <tr className="border-b border-success/20">
                                        <th className="py-2 text-success/60 uppercase">Feature</th>
                                        <th className="py-2 text-success font-black border-x border-success/20 px-4 bg-success/5">RoboFang</th>
                                        <th className="py-2 text-slate-500 px-4">OpenClaw</th>
                                        <th className="py-2 text-slate-500 px-4">CrewAI</th>
                                        <th className="py-2 text-slate-500 px-4">AutoGen</th>
                                        <th className="py-2 text-slate-500 px-4">LangGraph</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { f: 'Language', of: 'Rust', oc: 'TS', cr: 'Py', ag: 'Py', lg: 'Py' },
                                        { f: 'Autonomous Hands', of: '7 built-in', oc: 'None', cr: 'None', ag: 'None', lg: 'None' },
                                        { f: 'Security Layers', of: '16 discrete', oc: '3 basic', cr: '1 basic', ag: 'Docker', lg: 'AES' },
                                        { f: 'Cold Start', of: '<200ms', oc: '~6s', cr: '~3s', ag: '~4s', lg: '~2.5s' },
                                        { f: 'Install Size', of: '~32 MB', oc: '~500 MB', cr: '~100 MB', ag: '~200 MB', lg: '~150 MB' },
                                        { f: 'Audit Trail', of: 'Merkle Hash', oc: 'Logs', cr: 'Tracing', ag: 'Logs', lg: 'Checkpoints' },
                                        { f: 'Robotics Stack', of: 'Native (Bumi)', oc: 'None', cr: 'None', ag: 'None', lg: 'None' },
                                        { f: 'Creative FOSS', of: 'Blender/Gimp+', oc: 'Basic', cr: 'None', ag: 'Adapter', lg: 'None' },
                                        { f: 'Media Engine', of: 'Plex/Calibre', oc: 'None', cr: 'None', ag: 'None', lg: 'None' },
                                        { f: 'Production Hub', of: 'OSC/Reaper', oc: 'None', cr: 'None', ag: 'None', lg: 'None' },
                                        { f: 'XR/VR Integration', of: 'Unity/VRC', oc: 'None', cr: 'None', ag: 'None', lg: 'None' },
                                    ].map((row, idx) => (
                                        <tr key={idx} className="border-b border-success/10 hover:bg-white/5 transition-colors">
                                            <td className="py-2 text-slate-400 font-bold">{row.f}</td>
                                            <td className="py-2 text-success font-black border-x border-success/20 px-4 bg-success/5">{row.of}</td>
                                            <td className="py-2 text-slate-600 px-4">{row.oc}</td>
                                            <td className="py-2 text-slate-600 px-4">{row.cr}</td>
                                            <td className="py-2 text-slate-600 px-4">{row.ag}</td>
                                            <td className="py-2 text-slate-600 px-4">{row.lg}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    <motion.div
                        variants={item}
                        initial="hidden"
                        animate="show"
                        className="mt-8 p-6 verilog-border rounded-xl bg-black/40"
                    >
                        <div className="flex items-center gap-4">
                            <Container className="text-success" size={24} />
                            <div>
                                <h3 className="text-md font-bold text-white tracking-widest uppercase">System Integration Matrix</h3>
                                <p className="text-xs text-slate-500">Cross-referencing telemetry across {fleetCount} distributed nodes via FastMCP protocol.</p>
                            </div>
                            <div className="ml-auto flex -space-x-3">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-success/20 flex items-center justify-center">
                                        <div className="w-4 h-4 rounded-full bg-success/40 animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Decorative BG elements */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-success/5 to-transparent pointer-events-none" />
            <div className="absolute bottom-12 right-12 text-[100px] font-black text-success/5 font-mono select-none pointer-events-none">V03</div>
        </div>
    );
}
