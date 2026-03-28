import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings, 
  Layers, 
  Activity, 
  Cpu, 
  ShieldCheck,
  Zap,
  ChevronRight,
  Search,
  Bell,
  Menu,
  User
} from 'lucide-react';
import { cn } from '../utils/cn';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: React.ReactNode;
  isCollapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active, onClick, badge, isCollapsed }) => (
  <button
    onClick={onClick}
    title={isCollapsed ? label : undefined}
    className={cn(
      "w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 group relative",
      active 
        ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" 
        : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent",
      isCollapsed ? "justify-center" : "gap-3"
    )}
  >
    <Icon size={18} className={cn("shrink-0", active ? "text-violet-400" : "group-hover:text-cyan-400 transition-colors")} />
    
    <AnimatePresence>
      {!isCollapsed && (
        <motion.span 
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          className="text-sm font-medium tracking-tight overflow-hidden text-ellipsis whitespace-nowrap text-left flex-1"
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>

    {!isCollapsed && badge && (
      <div className="ml-auto">{badge}</div>
    )}

    {active && (
      <motion.div
        layoutId="active-indicator"
        className={cn(
          "absolute bg-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.6)]",
          isCollapsed ? "left-1 top-1/4 bottom-1/4 w-1" : "left-[-4px] top-1/4 bottom-1/4 w-1"
        )}
      />
    )}
    
    {!isCollapsed && !badge && (
      <ChevronRight size={14} className={cn("ml-auto opacity-0 group-hover:opacity-40 transition-opacity", active && "opacity-0")} />
    )}
  </button>
);

interface AppLayoutProps {
  children: React.ReactNode;
  activeView: 'hub' | 'fleet' | 'audit' | 'settings';
  onViewChange: (view: any) => void;
  fleetCount?: number;
  healthStatus?: 'ok' | 'error' | 'idle';
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, activeView, onViewChange, fleetCount = 0, healthStatus = 'idle' }) => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#050505] text-[#f8fafc] overflow-hidden selection:bg-violet-500/30">
      {/* Dynamic Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 256 }}
        className="shrink-0 border-r border-white/5 flex flex-col bg-[#080808]/80 backdrop-blur-xl z-20 relative"
      >
        <div className="p-4 mb-2 flex items-center justify-between">
          <div className={cn("flex items-center gap-3", isSidebarCollapsed && "justify-center w-full")}>
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600 shadow-lg shadow-violet-900/40 shrink-0">
              <Cpu size={20} className="text-white" />
            </div>
            
            <AnimatePresence>
              {!isSidebarCollapsed && (
                <motion.div 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden"
                >
                  <h1 className="text-xl font-bold tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent leading-none">
                    ROBOFANG
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-x-hidden">
          {!isSidebarCollapsed && (
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-4 mb-2 mt-4 whitespace-nowrap">
              Navigation
            </div>
          )}
          {isSidebarCollapsed && <div className="mt-8" />}
          
          <NavItem 
            icon={LayoutDashboard} 
            label="The Hub" 
            active={activeView === 'hub'} 
            onClick={() => onViewChange('hub')}
            isCollapsed={isSidebarCollapsed}
          />
          <NavItem 
            icon={Layers} 
            label="Fleet Deck" 
            active={activeView === 'fleet'} 
            onClick={() => onViewChange('fleet')}
            isCollapsed={isSidebarCollapsed}
            badge={
              <span className="bg-cyan-500/10 text-cyan-400 text-[10px] py-0.5 px-2 rounded-full font-mono border border-cyan-500/20">
                {fleetCount}
              </span>
            }
          />
          <NavItem 
            icon={Activity} 
            label="System Audit" 
            active={activeView === 'audit'} 
            onClick={() => onViewChange('audit')}
            isCollapsed={isSidebarCollapsed}
          />

          {!isSidebarCollapsed && (
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-4 mb-2 mt-8 whitespace-nowrap">
              Platform
            </div>
          )}
          {isSidebarCollapsed && <div className="mt-8" />}

          <NavItem 
            icon={ShieldCheck} 
            label="Security" 
            active={false}
            isCollapsed={isSidebarCollapsed}
          />
          <NavItem 
            icon={Settings} 
            label="Settings" 
            active={activeView === 'settings'} 
            onClick={() => onViewChange('settings')}
            isCollapsed={isSidebarCollapsed}
          />
        </nav>

        {/* Compact Footer Status */}
        <div className="p-4 mt-auto">
          {isSidebarCollapsed ? (
            <div className="flex justify-center mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
          ) : (
            <div className="glass-panel p-3 bg-gradient-to-br from-violet-900/10 to-transparent border-violet-500/10 hover:border-violet-500/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 pulse" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">System Online</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                Integrity Status: <span className="text-emerald-500/80">Sovereign</span>
              </p>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-transparent to-violet-900/5 relative flex flex-col">
        {/* Subtle grid background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
        </div>
        
        {/* Global Topbar */}
        <header className="sticky top-0 h-16 border-b border-white/5 backdrop-blur-md bg-[#050505]/60 flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Zap size={14} className="text-violet-500" />
                {activeView.replace('_', ' ')}
              </span>
            </div>
          </div>
          
          {/* Command Palette Trigger (V1 visual only) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8 relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-violet-400 transition-colors">
              <Search size={16} />
            </div>
            <input 
              disabled
              placeholder="Command Palette... (Coming soon)" 
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-12 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 cursor-not-allowed"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
              <kbd className="bg-black/30 text-slate-500 text-[10px] px-1.5 py-0.5 rounded border border-white/5 font-sans">Ctrl</kbd>
              <kbd className="bg-black/30 text-slate-500 text-[10px] px-1.5 py-0.5 rounded border border-white/5 font-sans">K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button 
              title="System Notifications"
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Bell size={18} />
              {healthStatus === 'error' && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              )}
              {healthStatus === 'ok' && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
              )}
            </button>
            
            <div className="w-px h-6 bg-white/10 mx-1" />
            
            {/* Operator Profile */}
            <button className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 p-[1px]">
                <div className="w-full h-full bg-[#050505] rounded-full flex items-center justify-center">
                  <User size={14} className="text-slate-300" />
                </div>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-semibold text-slate-200 leading-tight">Sandra Schipal</span>
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">Operator Admin</span>
              </div>
            </button>
          </div>
        </header>

        <section className="p-8 max-w-7xl w-full mx-auto relative z-0">
          {children}
        </section>
      </main>
    </div>
  );
};
