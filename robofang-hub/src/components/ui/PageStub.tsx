import React from 'react';
import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';

interface PageStubProps {
  title: string;
  icon: LucideIcon;
  category: string;
}

const PageStub: React.FC<PageStubProps> = ({ title, icon: Icon, category }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 h-full flex flex-col"
    >
      <header className="mb-12">
        <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
          <span>{category}</span>
          <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
          <span className="text-cyan-500/80">Active Substrate</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400">
            <Icon size={28} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-100">{title}</h1>
        </div>
      </header>

      <div className="flex-1 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm relative overflow-hidden flex flex-col items-center justify-center text-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Icon size={40} className="text-zinc-700 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-300 mb-4">Migration in Progress</h2>
          <p className="text-zinc-500 max-w-md mx-auto leading-relaxed">
            The <span className="text-zinc-300 font-semibold">{title}</span> vertical is currently being re-architected for standard-compliance. 
            Full neural bridge connectivity to the supervisor API is pending hardware initialization.
          </p>
          
          <div className="mt-12 flex gap-3 justify-center">
            <div className="px-4 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs font-mono text-zinc-400">
              STATUS: SCAFFOLDING
            </div>
            <div className="px-4 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs font-mono text-zinc-400">
              BRIDGE: OFFLINE
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PageStub;
