import React from 'react';
import {
  HelpCircle, Book, MessageSquare, Terminal, ExternalLink,
  ChevronRight, Code
} from "lucide-react";
import GlassCard from '../../components/ui/GlassCard';

const Help: React.FC = () => {
  const sections = [
    {
      title: 'Getting Started',
      icon: Book,
      links: [
        { label: 'Substrate Installation', href: '#' },
        { label: 'Core Handshake Protocol', href: '#' },
        { label: 'Council Integration', href: '#' },
      ]
    },
    {
      title: 'API Documentation',
      icon: Code,
      links: [
        { label: 'Rest API Reference', href: '#' },
        { label: 'WebSocket Streams', href: '#' },
        { label: 'MCP Sampling Schema', href: '#' },
      ]
    },
    {
      title: 'Dev Resources',
      icon: Terminal,
      links: [
        { label: 'CLI Toolbelt', href: '#' },
        { label: 'Hardware Scaffolding', href: '#' },
        { label: 'Simulation Environments', href: '#' },
      ]
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <HelpCircle size={20} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Support Node</h1>
        </div>
        <p className="text-zinc-400 text-sm max-w-xl font-medium">
          Access the archival knowledge core and technical protocols.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-8 flex items-center justify-between group cursor-pointer hover:bg-white/[0.04]">
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Book size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-widest">Protocol Docs</h3>
              <p className="text-xs text-zinc-500 font-medium">Read the primary implementation manifest.</p>
            </div>
          </div>
          <ChevronRight className="text-zinc-600 group-hover:text-white transition-colors" />
        </GlassCard>

        <GlassCard className="p-8 flex items-center justify-between group cursor-pointer hover:bg-white/[0.04]">
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <MessageSquare size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-widest">Community</h3>
              <p className="text-xs text-zinc-500 font-medium">Sync with other RoboFang architect nodes.</p>
            </div>
          </div>
          <ChevronRight className="text-zinc-600 group-hover:text-white transition-colors" />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <GlassCard key={section.title} className="p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <section.icon className="text-blue-400" size={18} />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">{section.title}</h3>
            </div>
            <div className="space-y-2">
              {section.links.map((link) => (
                <a 
                  key={link.label}
                  href={link.href}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 group transition-colors"
                >
                  <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white transition-colors uppercase">{link.label}</span>
                  <ExternalLink size={12} className="text-zinc-700 group-hover:text-blue-400 transition-colors" />
                </a>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white uppercase tracking-widest">Need Neural Hands?</h3>
            <p className="text-sm text-zinc-400 max-w-md">Our specialized development personas can assist with substrate configuration and protocol debugging.</p>
          </div>
          <button className="px-8 py-3 rounded-xl bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all">
            Deploy Assistant
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default Help;
