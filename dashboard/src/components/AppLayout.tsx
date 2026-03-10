import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Cpu,
    Settings,
    Activity,
    ChevronRight,
    ShieldCheck,
    UsersRound,
    ScrollText,
    Database,
    Clock,
    Sparkles,
    PanelLeftClose,
    Brain,
    Layers,
    Home,
    Palette,
    MonitorDot,
    Library,
    Wrench,
    Grid,
    MessageSquare,
    HelpCircle,
    Monitor,
    Bot,
    Rocket,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const location = useLocation();

    const pathnames = location.pathname.split('/').filter((x) => x);

    return (
        <div className="flex h-screen w-screen bg-[#06060c] text-slate-200 selection:bg-indigo-500/30 noise-bg overflow-hidden relative font-primary">
            {/* Background Mesh */}
            <div className="fixed inset-0 pointer-events-none opacity-20 mix-blend-soft-light animate-mesh z-0" />

            {/* Sidebar */}
            <aside
                className={`flex flex-col border-r border-white/5 bg-[#0a0a16]/90 backdrop-blur-3xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] z-40 relative ${isCollapsed ? 'w-[64px]' : 'w-[240px]'}`}
            >
                {/* Sidebar Header */}
                <div className="h-[72px] px-6 flex items-center justify-between border-b border-white/5" title="RoboFang Platform">
                    {!isCollapsed ? (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3.5"
                        >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                                <Activity size={18} className="text-white" />
                            </div>
                            <span className="font-heading font-bold text-xl tracking-tight text-white">RoboFang</span>
                        </motion.div>
                    ) : (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                            <Activity size={18} className="text-white" />
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                    <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" isCollapsed={isCollapsed} active={location.pathname === '/'} />
                    <NavItem to="/council" icon={<UsersRound size={20} />} label="Council" isCollapsed={isCollapsed} active={location.pathname === '/council'} />
                    <NavItem to="/showroom" icon={<Monitor size={20} />} label="Showroom" isCollapsed={isCollapsed} active={location.pathname === '/showroom'} />
                    <NavItem to="/fleet" icon={<Cpu size={20} />} label="Fleet" isCollapsed={isCollapsed} active={location.pathname === '/fleet'} />
                    <NavItem to="/hands" icon={<Layers size={20} />} label="Hands" isCollapsed={isCollapsed} active={location.pathname === '/hands'} />
                    <NavItem to="/robotics" icon={<Bot size={20} />} label="Robotics" isCollapsed={isCollapsed} active={location.pathname === '/robotics'} />
                    <NavItem to="/home" icon={<Home size={20} />} label="Home Hub" isCollapsed={isCollapsed} active={location.pathname === '/home'} />
                    <NavItem to="/creative" icon={<Palette size={20} />} label="Creative Hub" isCollapsed={isCollapsed} active={location.pathname === '/creative'} />
                    <NavItem to="/infra" icon={<MonitorDot size={20} />} label="Infra Hub" isCollapsed={isCollapsed} active={location.pathname === '/infra'} />
                    <NavItem to="/knowledge-hub" icon={<Library size={20} />} label="Knowledge Hub" isCollapsed={isCollapsed} active={location.pathname === '/knowledge-hub'} />
                    <NavItem to="/knowledge" icon={<Database size={20} />} label="Knowledge" isCollapsed={isCollapsed} active={location.pathname === '/knowledge'} />
                    <NavItem to="/llm" icon={<Brain size={20} />} label="LLM" isCollapsed={isCollapsed} active={location.pathname === '/llm'} />
                    <NavItem to="/chat" icon={<MessageSquare size={20} />} label="Chat" isCollapsed={isCollapsed} active={location.pathname === '/chat'} />
                    <NavItem to="/help" icon={<HelpCircle size={20} />} label="Help" isCollapsed={isCollapsed} active={location.pathname === '/help'} />
                    <NavItem to="/logger" icon={<ScrollText size={20} />} label="Logger" isCollapsed={isCollapsed} active={location.pathname === '/logger'} />
                    <NavItem to="/status" icon={<ShieldCheck size={20} />} label="Status" isCollapsed={isCollapsed} active={location.pathname === '/status'} />
                    <NavItem to="/tools" icon={<Wrench size={20} />} label="Tools" isCollapsed={isCollapsed} active={location.pathname === '/tools'} />
                    <NavItem to="/apps" icon={<Grid size={20} />} label="App Hub" isCollapsed={isCollapsed} active={location.pathname === '/apps'} />
                    <NavItem to="/installer" icon={<Wrench size={20} />} label="Installer" isCollapsed={isCollapsed} active={location.pathname === '/installer'} />
                    <NavItem to="/pulse" icon={<Activity size={20} />} label="Pulse Feed" isCollapsed={isCollapsed} active={location.pathname === '/pulse'} />
                    <NavItem to="/timeline" icon={<Clock size={20} />} label="Timeline" isCollapsed={isCollapsed} active={location.pathname === '/timeline'} />
                    <NavItem to="/kitchen-sink" icon={<Sparkles size={20} />} label="Kitchen Sink" isCollapsed={isCollapsed} active={location.pathname === '/kitchen-sink'} />
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-white/5 space-y-2">
                    <NavItem to="/onboarding" icon={<Rocket size={20} />} label="Onboarding" isCollapsed={isCollapsed} active={location.pathname === '/onboarding'} />
                    <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" isCollapsed={isCollapsed} active={location.pathname === '/settings'} />
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-full h-11 flex items-center justify-center rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/8 hover:border-white/10 transition-all group/toggle mt-1"
                        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        <PanelLeftClose
                            className={`text-slate-400 transition-transform duration-700 ${isCollapsed ? 'rotate-180' : ''}`}
                            size={18}
                        />
                    </button>
                    {!isCollapsed && (
                        <div className="mt-2 px-2 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Architecture</span>
                                <span className="text-[11px] font-mono text-slate-400">v1.2.0-SOTA</span>
                            </div>
                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)] animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Live</span>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative flex flex-col bg-transparent overflow-x-hidden z-10 custom-scrollbar">
                {/* Topbar */}
                <header className="h-[72px] px-8 border-b border-white/5 flex items-center justify-between sticky top-0 backdrop-blur-3xl bg-[#06060c]/60 z-30">
                    <div className="flex items-center gap-4 text-sm font-sans">
                        <div className="flex items-center gap-2.5 text-slate-400">
                            <span className="text-xs font-bold uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-colors">Core</span>
                            <ChevronRight size={13} className="opacity-30" />
                        </div>
                        {pathnames.length === 0 ? (
                            <span className="font-bold text-white tracking-wide text-base">Dashboard</span>
                        ) : (
                            <div className="flex items-center gap-2.5">
                                {pathnames.map((name, index) => {
                                    const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                                    const isLast = index === pathnames.length - 1;
                                    return (
                                        <div key={name} className="flex items-center gap-2.5">
                                            <NavLink
                                                to={routeTo}
                                                className={`capitalize transition-all duration-300 text-base ${isLast ? 'font-bold text-white tracking-wide' : 'text-slate-400 hover:text-indigo-400'}`}
                                            >
                                                {name.replace('-', ' ')}
                                            </NavLink>
                                            {!isLast && <ChevronRight size={13} className="opacity-30" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-8 font-sans">
                        {/* Status pill */}
                        <div className="hidden lg:flex items-center gap-8 px-6 py-2.5 bg-white/[0.03] border border-white/5 rounded-2xl shadow-inner shadow-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Active</span>
                            </div>
                            <div className="h-5 w-px bg-white/5" />
                            <div className="flex items-center gap-3">
                                <Cpu size={14} className="text-indigo-400" />
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">1.2ms P99</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <NavLink
                                to="/settings"
                                className="p-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-slate-300 group shadow-lg shadow-black/20"
                                title="System Settings"
                            >
                                <Settings size={22} className="group-hover:rotate-90 transition-transform duration-700" />
                            </NavLink>
                            <button
                                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-[1.5px] shadow-xl shadow-indigo-500/20 group cursor-pointer relative overflow-hidden active:scale-95 transition-transform"
                                title="Identity Core"
                            >
                                <div className="w-full h-full rounded-[14.5px] bg-[#0a0a16] flex items-center justify-center overflow-hidden">
                                    <ShieldCheck size={20} className="text-indigo-200 group-hover:scale-110 transition-transform relative z-10" />
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Transitions */}
                <div className="flex-1 relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 15, rotateX: 2 }}
                            animate={{ opacity: 1, y: 0, rotateX: 0 }}
                            exit={{ opacity: 0, y: -15, rotateX: -2 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="p-10 pb-24 h-full"
                        >
                            <div className="max-w-[1600px] mx-auto">
                                {children}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; isCollapsed: boolean; active: boolean }> = ({
    to, icon, label, isCollapsed, active,
}) => (
    <NavLink
        to={to}
        className={`flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${active
            ? 'bg-indigo-600/20 text-white border border-indigo-500/40 shadow-lg shadow-indigo-600/10'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
        title={label}
    >
        {active && (
            <motion.div
                layoutId="active-nav-bg"
                className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent rounded-2xl"
            />
        )}
        <div className={`transition-all duration-500 shrink-0 ${active ? 'text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.8)] scale-110' : 'group-hover:text-slate-100 group-hover:scale-110'}`}>
            {icon}
        </div>
        {!isCollapsed && (
            <span className={`text-[15px] font-bold tracking-tight whitespace-nowrap transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`}>
                {label}
            </span>
        )}
        {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-[#131320]/95 backdrop-blur-xl border border-white/10 rounded-xl text-xs font-bold text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-3 group-hover:translate-x-0 whitespace-nowrap z-50 shadow-2xl">
                {label}
            </div>
        )}
    </NavLink>
);

export default AppLayout;
