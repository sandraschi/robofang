import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    ChevronLeft,
    ChevronRight,
    Play,
    Pause,
    RotateCcw,
    Brain,
    Zap,
    BookOpen,
    Cpu,
    Shield
} from 'lucide-react';

interface Task {
    id: string;
    agent: string;
    title: string;
    status: 'completed' | 'ongoing' | 'pending' | 'failed';
    startTime: string; 
    duration: number; 
    color: string;
}

const LANES = [
    { id: 'core', name: 'Core', icon: <Zap size={16} />, color: 'emerald' },
    { id: 'logic', name: 'Logic', icon: <Brain size={16} />, color: 'indigo' },
    { id: 'knowledge', name: 'Knowledge', icon: <BookOpen size={16} />, color: 'blue' },
    { id: 'fleet', name: 'Fleet', icon: <Cpu size={16} />, color: 'purple' },
    { id: 'security', name: 'Security', icon: <Shield size={16} />, color: 'red' },
];

const INITIAL_TASKS: Task[] = [
    { id: '1', agent: 'core', title: 'Task Dispatch', status: 'completed', startTime: '10:00', duration: 15, color: 'emerald' },
    { id: '2', agent: 'logic', title: 'Intent Analysis', status: 'completed', startTime: '10:10', duration: 25, color: 'indigo' },
    { id: '3', agent: 'knowledge', title: 'Vector Retrieval', status: 'ongoing', startTime: '10:30', duration: 40, color: 'blue' },
    { id: '4', agent: 'fleet', title: 'Adapter Ping', status: 'pending', startTime: '11:00', duration: 20, color: 'purple' },
    { id: '5', agent: 'security', title: 'Policy Audit', status: 'ongoing', startTime: '10:45', duration: 30, color: 'red' },
];

const COLOR_MAP: Record<string, { bg: string, text: string, border: string, dot: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', dot: 'bg-indigo-400' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', dot: 'bg-purple-400' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
};

const Timeline: React.FC = () => {
    const [tasks] = useState<Task[]>(INITIAL_TASKS);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isPlaying, setIsPlaying] = useState(true);

    useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, [isPlaying]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 h-[calc(100vh-12rem)] flex flex-col pb-8">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-bold font-gradient flex items-center gap-4">
                        <Clock className="text-indigo-400" />
                        Orchestration Timeline
                    </h2>
                    <p className="text-text-secondary text-sm mt-1">Real-time visualization of agent task scheduling and system execution.</p>
                </div>

                <div className="flex items-center gap-4 bg-black/40 backdrop-blur-3xl border border-white/5 p-2 rounded-2xl shadow-2xl">
                    <div className="flex items-center gap-1 border-r border-white/5 pr-4 mr-2">
                        <button title="Previous" className="p-2 hover:bg-white/5 rounded-xl text-text-secondary transition-all active:scale-95"><ChevronLeft size={18} /></button>
                        <button title="Next" className="p-2 hover:bg-white/5 rounded-xl text-text-secondary transition-all active:scale-95"><ChevronRight size={18} /></button>
                    </div>

                    <div className="text-xl font-mono font-bold text-indigo-100 min-w-[100px] text-center tracking-tighter">
                        {currentTime.toLocaleTimeString([], { hour12: false })}
                    </div>

                    <div className="flex items-center gap-1 border-l border-white/5 pl-4 ml-2">
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            title={isPlaying ? "Pause" : "Play"}
                            className={`p-2 rounded-xl transition-all active:scale-95 ${isPlaying ? 'text-emerald-400 bg-emerald-400/10' : 'text-text-secondary hover:bg-white/10'}`}
                        >
                            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                        <button title="Reset" className="p-2 hover:bg-white/5 rounded-xl text-text-secondary transition-all active:scale-95"><RotateCcw size={18} /></button>
                    </div>
                </div>
            </header>

            <div className="flex-1 glass-panel rounded-[2rem] overflow-hidden flex flex-col relative shadow-2xl">
                <div className="flex h-14 border-b border-white/5 bg-white/[0.02]">
                    <div className="w-48 border-r border-white/5 shrink-0 flex items-center px-8 text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">
                        Agent / Lane
                    </div>
                    <div className="flex-1 flex relative">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="flex-1 border-r border-white/[0.03] flex items-center justify-center text-[10px] font-mono text-text-secondary/40 font-bold">
                                {String(9 + i).padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 relative overflow-y-auto custom-scrollbar">
                    <div
                        className="absolute top-0 bottom-0 w-px bg-emerald-500/50 z-10 shadow-[0_0_15px_rgba(16,185,129,0.3)] left-[var(--marker-pos)] pointer-events-none"
                        style={{ '--marker-pos': 'calc(12rem + 45%)' } as React.CSSProperties}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>

                    <div className="flex flex-col min-h-full">
                        {LANES.map((lane) => (
                            <div key={lane.id} className="flex min-h-[120px] border-b border-white/5 group hover:bg-white/[0.01] transition-all relative">
                                <div className="w-48 border-r border-white/5 shrink-0 flex flex-col justify-center px-8 gap-1 bg-black/20">
                                    <div className="flex items-center gap-3 text-sm font-bold">
                                        <div className={`p-2 rounded-xl ${COLOR_MAP[lane.color].bg} ${COLOR_MAP[lane.color].text} border ${COLOR_MAP[lane.color].border}`}>
                                            {lane.icon}
                                        </div>
                                        {lane.name}
                                    </div>
                                    <span className="text-[9px] font-mono font-black text-text-secondary/40 uppercase tracking-widest mt-1">
                                       Load: {tasks.filter(t => t.agent === lane.id && t.status === 'ongoing').length ? 'High' : 'Idle'}
                                    </span>
                                </div>

                                <div className="flex-1 relative py-6">
                                    {tasks.filter(t => t.agent === lane.id).map((task) => {
                                        const hour = parseInt(task.startTime.split(':')[0]);
                                        const minute = parseInt(task.startTime.split(':')[1]);
                                        const offsetPercent = ((hour - 9) * 60 + minute) / (12 * 60) * 100;
                                        const widthPercent = (task.duration / (12 * 60)) * 100;

                                        return (
                                            <motion.div
                                                key={task.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className={`absolute top-1/2 -translate-y-1/2 h-14 glass-panel border ${COLOR_MAP[task.color].border} ${COLOR_MAP[task.color].bg} flex flex-col justify-center px-4 cursor-pointer group/task hover:brightness-125 transition-all duration-300 rounded-2xl left-[var(--offset)] w-[var(--width)] shadow-xl`}
                                                style={{ '--offset': `${offsetPercent}%`, '--width': `${widthPercent}%` } as React.CSSProperties}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold truncate">{task.title}</span>
                                                    {task.status === 'ongoing' && (
                                                        <div className={`w-1.5 h-1.5 rounded-full ${COLOR_MAP[task.color].dot} animate-pulse shadow-lg`} />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-mono text-text-secondary font-bold">{task.startTime}</span>
                                                    <span className="text-[9px] font-mono font-black text-text-secondary/30">/ {task.duration}m</span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="h-14 border-t border-white/5 bg-black/40 flex items-center px-8 justify-between">
                    <div className="flex gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                            <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.15em]">System Ops</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.4)]" />
                            <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.15em]">Agent Reasoning</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]" />
                            <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.15em]">Security Protocol</span>
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-text-secondary/50 font-black tracking-widest">
                        PHASE-SYNC: LOCKED_STABLE
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timeline;
