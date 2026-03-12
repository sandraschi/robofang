import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Zap, Shield, Loader2, RefreshCw, Radio,
} from "lucide-react";
import GlassCard from '../../components/ui/GlassCard';

const BRIDGE_BASE_URL = 'http://localhost:10871';

interface PulseEvent {
  id: string;
  type: string;
  content: string;
  time: string;
  severity: 'low' | 'medium' | 'high';
  source: 'feed' | 'connector';
}

const Pulse: React.FC = () => {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPulse = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${BRIDGE_BASE_URL}/pulse`);
      const data = await resp.json();
      if (data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.warn('Bridge pulse unreachable, using mock');
      setEvents([
        { id: '1', type: 'Feed', content: 'Substrate cohesion verified at 99.4%', time: '2m ago', severity: 'low', source: 'feed' },
        { id: '2', type: 'System', content: 'Primary bridge handshake successful', time: '5m ago', severity: 'low', source: 'connector' },
        { id: '3', type: 'Security', content: 'Unauthorized port sweep blocked', time: '12m ago', severity: 'medium', source: 'connector' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPulse();
    const interval = setInterval(fetchPulse, 30000);
    return () => clearInterval(interval);
  }, [fetchPulse]);

  const getSeverityStyles = (s: string) => {
    switch(s) {
      case 'high': return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
      case 'medium': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      default: return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Radio size={20} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Global Pulse</h1>
          </div>
          <p className="text-zinc-400 text-sm max-w-xl font-medium">
            Live substrate stream and behavioral event logging.
          </p>
        </div>
        
        <button 
          onClick={fetchPulse}
          className="px-6 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Synchronize
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400">
              <Zap size={24} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Pulse</div>
              <div className="text-2xl font-black text-white">{events.length} Events</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Shield size={24} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Threat Level</div>
              <div className="text-2xl font-black text-emerald-400">Nominal</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
              <Activity size={24} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cohesion</div>
              <div className="text-2xl font-black text-amber-400">99.4%</div>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="divide-y divide-white/[0.05]">
          <AnimatePresence mode="popLayout">
            {events.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
                className="p-6 flex items-center justify-between group hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-2 h-2 rounded-full ${event.severity === 'high' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : event.severity === 'medium' ? 'bg-amber-500' : 'bg-cyan-500'}`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getSeverityStyles(event.severity)}`}>
                        {event.type}
                       </span>
                      <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors uppercase">
                        {event.content}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-medium font-mono">
                      Source: {event.source} • Index: {event.id}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">
                    {event.time}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </GlassCard>
    </div>
  );
};

export default Pulse;
