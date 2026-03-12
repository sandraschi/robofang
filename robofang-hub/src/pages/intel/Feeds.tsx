import React from 'react';
import { Rss, Search, Plus, Filter, Globe, Github, Twitter, Newspaper, ExternalLink, RefreshCw } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const Feeds: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
              <Rss size={20} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Feeds</h1>
          </div>
          <p className="text-zinc-400 text-sm max-w-xl font-medium">
            Ingestion streams from OSINT, social hubs, and technical repositories.
          </p>
        </div>
        <div className="flex gap-2">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-hover:text-orange-400 transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Search streams..." 
                className="bg-white/[0.02] border border-white/[0.05] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/30 transition-all w-48 focus:w-64"
              />
           </div>
           <button className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-zinc-400 hover:text-white transition-all">
            <Filter size={18} />
          </button>
           <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20">
            <Plus size={16} /> Add Feed
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        {[
          { name: 'arXiv / Machine Learning', icon: Globe, items: 42, color: 'blue', status: 'Active' },
          { name: 'GitHub / Trending MCP', icon: Github, items: 12, color: 'zinc', status: 'Syncing' },
          { name: 'X / AI Sovereignty', icon: Twitter, items: 156, color: 'sky', status: 'Active' },
          { name: 'Reuters / Geopolitics', icon: Newspaper, items: 28, color: 'red', status: 'Paused' },
          { name: 'Hackernews / Agentic SOTA', icon: Search, items: 85, color: 'orange', status: 'Active' },
          { name: 'Wired / Tech Analysis', icon: Globe, items: 14, color: 'indigo', status: 'Active' },
        ].map((feed, i) => (
          <GlassCard key={i} className="group overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-xl bg-${feed.color === 'zinc' ? 'white/10' : feed.color + '-500/10'} text-${feed.color === 'zinc' ? 'white' : feed.color + '-500'}`}>
                  <feed.icon size={20} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                    feed.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                    feed.status === 'Syncing' ? 'bg-orange-500/10 text-orange-400' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {feed.status}
                  </span>
                   {feed.status === 'Syncing' && <RefreshCw size={10} className="text-orange-400 animate-spin" />}
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-bold text-white group-hover:text-orange-400 transition-colors">{feed.name}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1 italic">{feed.items} New Packets Since Last Sync</p>
              </div>

              <div className="flex items-center space-x-[-8px]">
                 {[1,2,3,4].map(avatar => (
                   <div key={avatar} className="w-6 h-6 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900" />
                   </div>
                 ))}
                 <div className="w-6 h-6 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-500">+12</div>
              </div>

              <div className="pt-2">
                 <button className="w-full py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-all flex items-center justify-center gap-2">
                   Enter Stream <ExternalLink size={12} />
                 </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default Feeds;
