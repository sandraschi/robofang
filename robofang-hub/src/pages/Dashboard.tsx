import React from 'react';
import { motion } from 'framer-motion';
import { 
    Beaker, Cpu, Globe, Hand, Shield, Zap, 
    TrendingUp, ArrowUpRight, ArrowDownRight, ZapOff, 
    Network, Database, Clock, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Dashboard: React.FC = () => {
    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <Badge variant="glass" className="bg-emerald-500/10 border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase tracking-widest px-3 py-1">
                        System Online · Nominal
                    </Badge>
                </div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-5xl font-bold tracking-tighter text-white mb-3">
                            Swarm <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400">Intelligence</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl font-medium leading-relaxed">
                            Comprehensive state analysis of the RoboFang Fleet. Real-time telemetry, agentic performance metrics, and substrate health.
                        </p>
                    </div>
                </div>
            </header>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    icon={<Cpu size={20} />} 
                    label="CPU Load" 
                    value="12.4%" 
                    trend="+2.1%" 
                    trendUp={true}
                    color="cyan"
                />
                <MetricCard 
                    icon={<Database size={20} />} 
                    label="Memory" 
                    value="4.2 GB" 
                    trend="Stable" 
                    trendUp={null}
                    color="purple"
                />
                <MetricCard 
                    icon={<Zap size={20} />} 
                    label="Agency Pulse" 
                    value="107ms" 
                    trend="-12ms" 
                    trendUp={false}
                    color="yellow"
                />
                <MetricCard 
                    icon={<Shield size={20} />} 
                    label="Integrity" 
                    value="100%" 
                    trend="Verified" 
                    trendUp={null}
                    color="emerald"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Telemetry Card */}
                <Card className="lg:col-span-2 bg-slate-950/40 border-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Network size={120} className="text-emerald-400" />
                    </div>
                    <CardHeader className="p-8 pb-0">
                        <div className="flex items-center justify-between mb-2">
                             <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/30 text-emerald-400 bg-emerald-500/5">Live Stream</Badge>
                             <span className="text-[10px] font-mono text-slate-500">ROBOFANG_SYS_TELEMETRY</span>
                        </div>
                        <CardTitle className="text-2xl font-bold text-white tracking-tight">Fleet Observation Deck</CardTitle>
                        <CardDescription className="text-slate-400 font-medium mt-1">Real-time substrate activity per node cluster</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="h-64 flex items-end justify-center gap-1.5 relative px-4 border-b border-white/[0.03]">
                            {Array.from({ length: 30 }).map((_, i) => {
                                const height = 20 + Math.abs(Math.sin(i * 0.5) * 80);
                                return (
                                    <motion.div 
                                        key={i}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${height}%` }}
                                        transition={{ duration: 1, delay: i * 0.02, repeat: Infinity, repeatType: 'reverse' }}
                                        className="w-full max-w-[12px] rounded-t-sm bg-gradient-to-t from-emerald-500/20 to-emerald-400/60"
                                    />
                                );
                            })}
                            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent shadow-[0_0_20px_rgba(52,211,153,0.3)]" />
                        </div>
                        
                        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
                            <SmallMetric label="Total Hubs" value="7" />
                            <SmallMetric label="Active Agents" value="24" />
                            <SmallMetric label="IO Operations" value="1.2k/s" />
                            <SmallMetric label="Substrate Uptime" value="99.9%" />
                        </div>
                    </CardContent>
                </Card>

                {/* Status Column */}
                <div className="space-y-6">
                    <Card className="bg-slate-950/40 border-slate-800 shadow-xl">
                        <CardHeader className="p-6 pb-2">
                             <div className="flex items-center gap-2 mb-2">
                                <Clock size={14} className="text-slate-500" />
                                <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Recent Events</CardTitle>
                             </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-2">
                            <EventItem icon={<Globe size={14} />} title="Network Migration" time="2m ago" type="info" />
                            <EventItem icon={<Beaker size={14} />} title="Agent Sandbox Init" time="15m ago" type="success" />
                            <EventItem icon={<Hand size={14} />} title="Access Level Change" time="1h ago" type="warning" />
                            <EventItem icon={<ZapOff size={14} />} title="Virtual Hub Sync" time="3h ago" type="error" />
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-slate-950/40 border-slate-800 shadow-xl">
                        <CardHeader className="p-6 pb-2">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck size={14} className="text-slate-500" />
                                <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Substrate Health</CardTitle>
                             </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                            <HealthRow label="Supervisor Node" status="ONLINE" color="emerald" />
                            <HealthRow label="Bridge Protocol" status="ONLINE" color="emerald" />
                            <HealthRow label="RAG Index Cluster" status="SYNCING" color="cyan" />
                            <HealthRow label="OSC Interface" status="STANDBY" color="slate" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ icon, label, value, trend, trendUp, color }: { 
    icon: React.ReactNode, 
    label: string, 
    value: string, 
    trend: string, 
    trendUp: boolean | null,
    color: string 
}) => {
    const colorMap: Record<string, string> = {
        cyan: 'text-cyan-400 bg-cyan-500/5 border-cyan-500/20 group-hover:border-cyan-500/40',
        purple: 'text-purple-400 bg-purple-500/5 border-purple-500/20 group-hover:border-purple-500/40',
        yellow: 'text-yellow-400 bg-yellow-500/5 border-yellow-500/20 group-hover:border-yellow-500/40',
        emerald: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20 group-hover:border-emerald-500/40',
    };

    return (
        <Card className={`group relative p-6 bg-slate-950/40 border-slate-800 hover:border-slate-700 transition-all duration-300 shadow-lg`}>
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl border transition-all duration-300 ${colorMap[color] || colorMap.cyan}`}>
                    {icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-3xl font-bold text-white tracking-tighter leading-none">{value}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                        {trendUp === true && <ArrowUpRight size={12} className="text-emerald-400" />}
                        {trendUp === false && <ArrowDownRight size={12} className="text-red-400" />}
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${trendUp === true ? 'text-emerald-500/70' : trendUp === false ? 'text-red-500/70' : 'text-slate-600'}`}>
                            {trend}
                        </span>
                    </div>
                </div>
                <div className="opacity-5 group-hover:opacity-10 transition-opacity translate-x-3 translate-y-3">
                    <TrendingUp size={48} className={color === 'cyan' ? 'text-cyan-400' : 'text-slate-400'} />
                </div>
            </div>
        </Card>
    );
};

const SmallMetric = ({ label, value }: { label: string, value: string }) => (
    <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">{label}</span>
        <span className="text-xl font-bold text-white tracking-tight block">{value}</span>
    </div>
);

const EventItem = ({ icon, title, time, type }: { icon: React.ReactNode, title: string, time: string, type: 'info' | 'success' | 'warning' | 'error' }) => {
    const typeColors = {
        info: 'text-blue-400 group-hover:text-blue-300',
        success: 'text-emerald-400 group-hover:text-emerald-300',
        warning: 'text-yellow-400 group-hover:text-yellow-300',
        error: 'text-red-400 group-hover:text-red-300'
    };
    return (
        <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-all cursor-pointer border border-transparent hover:border-white/5 group">
            <div className={`shrink-0 p-2 rounded-lg bg-white/5 transition-colors ${typeColors[type]}`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <span className="block text-xs font-bold text-slate-200 truncate">{title}</span>
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{time}</span>
            </div>
            <ArrowUpRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
        </div>
    );
};

const HealthRow = ({ label, status, color }: { label: string, status: string, color: string }) => {
    const statusColors: Record<string, string> = {
        emerald: 'text-emerald-400',
        cyan: 'text-cyan-400',
        slate: 'text-slate-500',
    };
    return (
        <div className="flex justify-between items-center py-1">
            <span className="text-xs font-bold text-slate-400">{label}</span>
            <div className="flex items-center gap-2">
                <div className={`w-1 h-1 rounded-full animate-pulse ${color === 'slate' ? 'bg-slate-600' : statusColors[color].replace('text-', 'bg-')}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${statusColors[color] || 'text-slate-500'}`}>
                    {status}
                </span>
            </div>
        </div>
    );
};

export default Dashboard;
