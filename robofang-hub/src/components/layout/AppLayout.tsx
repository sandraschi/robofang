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
  Clock
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  {
    title: 'Hubs',
    items: [
      { to: '/', icon: Activity, label: 'Dashboard' },
      { to: '/home', icon: Home, label: 'Home Hub' },
      { to: '/infra', icon: Server, label: 'Infrastructure' },
      { to: '/knowledge', icon: BookOpen, label: 'Knowledge' },
      { to: '/robotics', icon: Cpu, label: 'Robotics' },
      { to: '/virtual', icon: Monitor, label: 'Virtual' },
      { to: '/creative', icon: Palette, label: 'Creative' },
    ]
  },
  {
    title: 'Management',
    items: [
      { to: '/fleet', icon: Bot, label: 'Fleet' },
      { to: '/installer', icon: Boxes, label: 'Installer' },
      { to: '/council', icon: Users, label: 'Personnel' },
      { to: '/deliberations', icon: Scale, label: 'Reasoning' },
      { to: '/chat', icon: MessageSquare, label: 'Interface' },
      { to: '/timeline', icon: Clock, label: 'History' },
      { to: '/agents', icon: Waves, label: 'Direct Control' },
    ]
  },
  {
    title: 'Intel',
    items: [
      { to: '/scraper', icon: Search, label: 'Scraper' },
      { to: '/intelligence', icon: Zap, label: 'Intelligence' },
      { to: '/analysis', icon: BarChart3, label: 'Analysis' },
      { to: '/evidence', icon: FileSearch, label: 'Evidence' },
      { to: '/reports', icon: FileText, label: 'Reports' },
      { to: '/alerts', icon: Bell, label: 'Alerts' },
      { to: '/feeds', icon: Rss, label: 'Feeds' },
    ]
  },
  {
    title: 'Systems',
    items: [
      { to: '/status', icon: ShieldCheck, label: 'Status' },
      { to: '/pulse', icon: Radio, label: 'Pulse' },
      { to: '/settings', icon: Settings, label: 'Settings' },
      { to: '/help', icon: HelpCircle, label: 'Help' },
      { to: '/lab', icon: FlaskConical, label: 'Lab' },
      { to: '/admin', icon: Shield, label: 'Admin' },
      { to: '/terminal', icon: Terminal, label: 'Terminal' },
      { to: '/browser', icon: Globe, label: 'Browser' },
      { to: '/filesystem', icon: Folder, label: 'FileSystem' },
      { to: '/profile', icon: User, label: 'Profile' },
      { to: '/logs', icon: Activity, label: 'Logs' },
      { to: '/notifications', icon: BellRing, label: 'Notifications' },
    ]
  }
];

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch (e) {
      console.error('Failed to parse sidebar-collapsed from localStorage', e);
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  return (
    <div className="app-container">
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className="sidebar overflow-hidden flex flex-col relative"
      >
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-0 top-12 translate-x-1/2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors z-50"
        >
          {isCollapsed ? <Menu size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex items-center gap-3 mb-10 px-2 mt-4 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center glow-pulse shrink-0">
            <Cpu className="text-white" size={24} />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-2xl font-bold font-gradient whitespace-nowrap"
              >
                robofang
              </motion.h1>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
          {navigation.map((group) => (
            <div key={group.title}>
              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-4 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]"
                >
                  {group.title}
                </motion.div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem 
                    key={item.to} 
                    to={item.to} 
                    icon={<item.icon size={20} />} 
                    label={item.label} 
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </motion.aside>

      <main className="main-content">
        {children}
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
    title={isCollapsed ? label : undefined}
    className={({ isActive }) => `
      flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group
      ${isActive 
        ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.05)]' 
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
      }
    `}
  >
    <div className="shrink-0 group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <AnimatePresence>
      {!isCollapsed && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="font-medium whitespace-nowrap overflow-hidden"
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  </NavLink>
);

export default AppLayout;
