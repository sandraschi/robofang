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
    startTime: string; // HH:mm:ss
    duration: number; // in minutes for visualization
    color: string;
}

const LANES = [
    { id: 'cortex', name: 'Cortex', icon: <Zap size={16} />, color: 'emerald' },
    { id: 'reasoning', name: 'Reasoning', icon: <Brain size={16} />, color: 'indigo' },
    { id: 'knowledge', name: 'Knowledge', icon: <BookOpen size={16} />, color: 'blue' },
    { id: 'fleet', name: 'Fleet', icon: <Cpu size={16} />, color: 'purple' },
    { id: 'security', name: 'Security', icon: <Shield size={16} />, color: 'red' },
];

const INITIAL_TASKS: Task[] = [
    { id: '1', agent: 'cortex', title: 'Task Dispatch', status: 'completed', startTime: '10:00', duration: 15, color: 'emerald' },
    { id: '2', agent: 'reasoning', title: 'Intent Analysis', status: 'completed', startTime: '10:10', duration: 25, color: 'indigo' },
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
        <div className="p-6 max-w-7xl mx-auto space-y-8 h-full flex flex-col">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Clock className="text-indigo-400" />
                        Orchestration Timeline
                    </h1>
                    <p className="text-slate-400 mt-1">Real-time visualization of agent task scheduling and execution.</p>
                </div>

                <div className="flex items-center gap-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-2 rounded-xl">
                    <div className="flex items-center gap-1 border-r border-slate-800 pr-4 mr-2">
                        <button
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors active:scale-95"
                            title="Previous Hour"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors active:scale-95"
                            title="Next Hour"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className="text-xl font-mono font-bold text-white min-w-[100px] text-center">
                        {currentTime.toLocaleTimeString([], { hour12: false })}
                    </div>

                    <div className="flex items-center gap-1 border-l border-slate-800 pl-4 ml-2">
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`p-2 rounded-lg transition-colors active:scale-95 ${isPlaying ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-400 hover:bg-slate-800'}`}
                            title={isPlaying ? 'Pause' : 'Resume'}
                        >
                            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                        <button
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors active:scale-95"
                            title="Reset Timeline"
                        >
                            <RotateCcw size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden flex flex-col relative shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                {/* Time Axis (Top) */}
                <div className="flex h-12 border-b border-slate-800 bg-slate-950/30">
                    <div className="w-48 border-r border-slate-800 shrink-0 flex items-center px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Agent / Lane
                    </div>
                    <div className="flex-1 flex relative">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="flex-1 border-r border-slate-800/30 flex items-center justify-center text-[10px] font-mono text-slate-600">
                                {String(9 + i).padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lanes Grid */}
                <div className="flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {/* Time Indicator Marker */}
                    <div
                        className="absolute top-0 bottom-0 w-px bg-emerald-500 z-10 shadow-[0_0_8px_rgba(16,185,129,0.5)] left-[var(--marker-pos)]"
                        style={{ '--marker-pos': 'calc(12rem + 45%)' } as React.CSSProperties}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-500 rounded-full" />
                    </div>

                    <div className="flex flex-col h-full">
                        {LANES.map((lane) => (
                            <div key={lane.id} className="flex min-h-[100px] border-b border-slate-800/50 group hover:bg-white/[0.02] transition-colors relative">
                                {/* Lane Header */}
                                <div className="w-48 border-r border-slate-800 shrink-0 flex flex-col justify-center px-6 gap-1 relative bg-slate-950/20">
                                    <div className={`absolute left-0 top-1 bottom-1 w-1 ${COLOR_MAP[lane.color].bg} rounded-r-full`} />
                                    <div className="flex items-center gap-2 text-white font-medium">
                                        <div className={`p-1.5 rounded-lg ${COLOR_MAP[lane.color].bg} ${COLOR_MAP[lane.color].text}`}>
                                            {lane.icon}
                                        </div>
                                        {lane.name}
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500">ACTIVE TASKS: {tasks.filter(t => t.agent === lane.id && t.status === 'ongoing').length}</span>
                                </div>

                                {/* Lane Content (Task Blocks) */}
                                <div className="flex-1 relative py-4">
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
                                                whileHover={{ y: -2 }}
                                                className={`absolute top-1/2 -translate-y-1/2 h-12 glass-panel border border-${task.color}-500/20 ${COLOR_MAP[task.color].bg} flex flex-col justify-center px-3 cursor-pointer group/task overflow-hidden min-w-[120px] rounded-xl transition-all duration-300 hover:shadow-xl hover:${COLOR_MAP[task.color].border} left-[var(--offset)] w-[var(--width)]`}
                                                style={{ '--offset': `${offsetPercent}%`, '--width': `${widthPercent}%` } as React.CSSProperties}
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-r from-${task.color}-500/5 to-transparent opacity-0 group-hover/task:opacity-100 transition-opacity`} />
                                                <div className="flex items-center justify-between gap-2 relative">
                                                    <span className="text-xs font-bold text-white truncate">{task.title}</span>
                                                    {task.status === 'ongoing' && (
                                                        <div className={`w-1.5 h-1.5 rounded-full ${COLOR_MAP[task.color].dot} animate-pulse`} />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 relative">
                                                    <span className="text-[9px] font-mono text-slate-500">{task.startTime}</span>
                                                    <span className="text-[9px] font-mono font-bold text-slate-600">({task.duration}m)</span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer / Stats */}
                <div className="h-12 border-t border-slate-800 bg-slate-950/30 flex items-center px-6 justify-between">
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Normal Ops</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deliberating</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Override</span>
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                        VIRTUAL QUARTZ SYNC: ACTIVE (±0.002ms)
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timeline;
