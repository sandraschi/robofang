import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot,
  Cpu, 
  Radio, 
  ShieldCheck, 
  Settings, 
  HelpCircle,
  Boxes,
  Home,
  Server,
  BookOpen,
  Monitor,
  Palette,
  Users,
  Scale,
  MessageSquare,
  Waves,
  Search,
  Zap,
  BarChart3,
  FileSearch,
  FileText,
  Bell,
  Rocket,
  Rss,
  FlaskConical,
  Shield,
  Terminal,
  Globe,
  Folder,
  User,
  Activity,
  BellRing,
  ChevronLeft,
  Menu,
  Clock,
  LayoutDashboard,
  Calendar,
  Send,
  Hand
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  {
    title: 'Get started',
    items: [
      { to: '/onboarding', icon: Rocket, label: 'Onboarding' },
      { to: '/installer', icon: Boxes, label: 'Fleet Installer' },
    ]
  },
  {
    title: 'Hubs',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/home', icon: Home, label: 'Home Hub' },
      { to: '/infra', icon: Server, label: 'Infrastructure' },
      { to: '/knowledge', icon: BookOpen, label: 'Knowledge Base' },
      { to: '/robotics', icon: Cpu, label: 'Robotics' },
      { to: '/virtual', icon: Monitor, label: 'Virtual Ops' },
      { to: '/creative', icon: Palette, label: 'Creative Studio' },
    ]
  },
  {
    title: 'Management',
    items: [
      { to: '/fleet', icon: Bot, label: 'Fleet Management' },
      { to: '/hands', icon: Hand, label: 'Hands' },
      { to: '/schedule', icon: Calendar, label: 'Schedule' },
      { to: '/inbox', icon: Send, label: 'Start activity' },
      { to: '/council', icon: Users, label: 'Team' },
      { to: '/deliberations', icon: Scale, label: 'Logic' },
      { to: '/chat', icon: MessageSquare, label: 'Communication Hub' },
      { to: '/timeline', icon: Clock, label: 'Event History' },
      { to: '/agents', icon: Waves, label: 'Agents' },
    ]
  },
  {
    title: 'Intelligence',
    items: [
      { to: '/scraper', icon: Search, label: 'Web Scraper' },
      { to: '/intelligence', icon: Zap, label: 'AI Core' },
      { to: '/analysis', icon: BarChart3, label: 'Data Analysis' },
      { to: '/evidence', icon: FileSearch, label: 'Data Store' },
      { to: '/reports', icon: FileText, label: 'Reports' },
      { to: '/alerts', icon: Bell, label: 'System Alerts' },
      { to: '/feeds', icon: Rss, label: 'Data Feeds' },
    ]
  },
  {
    title: 'Systems & Tools',
    items: [
      { to: '/status', icon: ShieldCheck, label: 'Health Status' },
      { to: '/pulse', icon: Radio, label: 'System Pulse' },
      { to: '/settings', icon: Settings, label: 'Settings' },
      { to: '/help', icon: HelpCircle, label: 'Help' },
      { to: '/lab', icon: FlaskConical, label: 'Lab' },
      { to: '/admin', icon: Shield, label: 'Security Admin' },
      { to: '/terminal', icon: Terminal, label: 'System Terminal' },
      { to: '/browser', icon: Globe, label: 'Web Browser' },
      { to: '/filesystem', icon: Folder, label: 'File Manager' },
      { to: '/profile', icon: User, label: 'User Profile' },
      { to: '/logs', icon: Activity, label: 'Audit Logs' },
      { to: '/notifications', icon: BellRing, label: 'Notifications' },
    ]
  }
];

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const defaultExpanded: Record<string, boolean> = Object.fromEntries(
    navigation.map((g) => [g.title, true])
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebar-expanded-groups');
      const parsed = saved ? JSON.parse(saved) : {};
      return { ...defaultExpanded, ...parsed };
    } catch {
      return { ...defaultExpanded };
    }
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebar-expanded-groups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="flex bg-[#03030b] text-slate-200 min-h-screen font-sans selection:bg-purple-500/30">
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className="fixed inset-y-0 left-0 bg-[#06060f] border-r border-white/5 flex flex-col z-50 backdrop-blur-xl"
      >
        <div className="p-6 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
            <Cpu className="text-white" size={24} />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col"
              >
                <h1 className="text-xl font-black text-white tracking-tighter leading-none">ROBOFANG</h1>
                <span className="text-xs font-bold text-slate-500 tracking-[0.2em] uppercase mt-1">Management Hub</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-4 py-4">
            {navigation.map((group) => {
              const isExpanded = expandedGroups[group.title] !== false;
              return (
                <div key={group.title} className="space-y-1">
                  {!isCollapsed && (
                    <button 
                      onClick={() => toggleGroup(group.title)}
                      className="w-full h-8 px-4 flex items-center justify-between text-xs font-black text-slate-600 uppercase tracking-[0.3em] hover:text-slate-400 transition-colors group"
                    >
                      <span>{group.title}</span>
                      <motion.div
                        animate={{ rotate: isExpanded ? 0 : -90 }}
                        className="text-slate-700 group-hover:text-slate-400"
                      >
                        <ChevronLeft size={12} className="rotate-270" style={{ transform: isExpanded ? 'rotate(270deg)' : 'rotate(180deg)' }} />
                      </motion.div>
                    </button>
                  )}
                  
                  <AnimatePresence initial={false}>
                    {(isExpanded || isCollapsed) && (
                      <motion.div
                        initial={isCollapsed ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden space-y-1"
                      >
                        {group.items.map((item) => (
                          <NavItem 
                            key={item.to} 
                            to={item.to} 
                            icon={<item.icon size={18} />} 
                            label={item.label} 
                            isCollapsed={isCollapsed}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-white/5 bg-black/20">
            <Button
                variant="glass"
                size="sm"
                className="w-full justify-start gap-3 h-10 bg-transparent border-transparent hover:bg-white/5 rounded-xl text-slate-400"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                {!isCollapsed && <span className="text-xs font-bold uppercase tracking-widest">Collapse View</span>}
            </Button>
        </div>
      </motion.aside>

      <main 
        className="flex-1 transition-all duration-300 min-h-screen"
        style={{ marginLeft: isCollapsed ? 80 : 280 }}
      >
        <div className="p-8 md:p-12 lg:p-16">
            {children}
        </div>
      </main>
    </div>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
}

const NavItem = ({ to, icon, label, isCollapsed }: NavItemProps) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group relative
      ${isActive 
        ? 'bg-white/[0.04] text-white border border-white/[0.05] shadow-lg shadow-black/20' 
        : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.02]'
      }
    `}
  >
    {({ isActive }) => (
        <>
            <div className={`shrink-0 transition-all duration-300 ${isActive ? 'text-purple-400' : 'group-hover:text-slate-300'}`}>
                {icon}
            </div>
            {!isCollapsed && (
                <span className={`text-[13px] font-bold tracking-tight whitespace-nowrap overflow-hidden transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {label}
                </span>
            )}
            {isActive && (
                <motion.div 
                    layoutId="nav-glow"
                    className="absolute left-0 w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-r-full"
                />
            )}
            {isCollapsed && (
                 <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded hidden group-hover:block whitespace-nowrap pointer-events-none z-50">
                    {label}
                 </div>
            )}
        </>
    )}
  </NavLink>
);

export default AppLayout;
