import React from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Loader2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';
import { usePersonalityApi, type Persona } from '../api/personality';
import { useSystemApi } from '../api/system';
import GlassCard from '../components/ui/GlassCard';

// Derived logic from legacy
const derivedLoad = (name: string): number => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFF;
  return 10 + (h % 71); // 10–80
};

const deriveRole = (p: Persona): string => {
  if (p.role) return p.role;
  const n = (p.name + ' ' + (p.system_prompt ?? '')).toLowerCase();
  if (n.includes('security') || n.includes('guard')) return 'Guardrail Specialist';
  if (n.includes('creat') || n.includes('innovat')) return 'Innovation Agent';
  if (n.includes('reason') || n.includes('logic')) return 'Reductionist Analyst';
  if (n.includes('sovereign') || n.includes('alpha')) return 'Lead Strategist';
  if (n.includes('knowledge') || n.includes('memory')) return 'Knowledge Curator';
  return 'Autonomous Agent';
};

const MATRIX_ANIMATIONS = Array.from({ length: 16 }).map(() => ({
  duration: 2 + Math.random() * 2,
  delay: Math.random()
}));

const Council: React.FC = () => {
  const { personas, loading: pLoading, error: pError, refresh: refreshPersonas } = usePersonalityApi();
  const { systemData, loading: sLoading, refresh: refreshSystem } = useSystemApi();

  const handleRefresh = () => {
    refreshPersonas();
    refreshSystem();
  };

  const loading = pLoading || sLoading;

  const connectorEvents = systemData
    ? Object.entries(systemData.connectors)
        .slice(0, 6)
        .map(([name, state]) => ({
          title: name.replace(/-/g, ' '),
          status: state.online ? 'online' : 'offline',
          online: state.online
        }))
    : [];

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-4xl font-bold font-gradient mb-2 underline decoration-indigo-500/30 underline-offset-8 transition-all hover:decoration-indigo-500/50 cursor-default">
            Personnel Registry
          </h2>
          <p className="text-text-secondary text-sm">Orchestrating autonomous persona workload distribution.</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={loading}
          className="glass-panel-interactive px-4 py-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Registry
        </button>
      </header>

      {pError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={18} />
          {pError}
        </div>
      )}

      {loading && !personas.length ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 size={48} className="text-indigo-500 animate-spin" />
          <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Polling Personnel Profiles...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {personas.map((p, i) => (
            <PersonaCard key={p.name} persona={p} index={i} />
          ))}
          {!personas.length && !loading && (
             <GlassCard className="lg:col-span-4 p-12 text-center text-text-secondary">
               No personas registered. Verify bridge connectivity.
             </GlassCard>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-2 min-h-[400px] flex flex-col" title="Workload Distribution Matrix">
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black/20 rounded-2xl border border-white/5 relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
             <div className="grid grid-cols-4 gap-4 relative z-10">
                {MATRIX_ANIMATIONS.map((anim, i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.1, 1] }}
                    transition={{ duration: anim.duration, repeat: Infinity, delay: anim.delay }}
                    className="w-4 h-4 rounded bg-indigo-500/30"
                  />
                ))}
             </div>
             <p className="mt-8 text-[10px] font-mono uppercase tracking-[0.3em] text-indigo-400/50 font-bold text-center">
               Resource allocation mapping in progress...
             </p>
          </div>
        </GlassCard>

        <GlassCard title="Connector States">
          <div className="space-y-4">
            {connectorEvents.map((event, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${event.online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-bold capitalize">{event.title}</p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${event.online ? 'text-green-500' : 'text-red-500'}`}>
                  {event.status}
                </span>
              </div>
            ))}
            
            {!connectorEvents.length && (
              <p className="text-center text-text-secondary text-xs py-8">No bridge connectors detected.</p>
            )}

            {systemData && (
              <div className="mt-6 pt-6 border-t border-white/5 flex flex-col gap-2">
                 <div className="flex justify-between text-[10px] font-mono text-text-secondary">
                    <span>Uptime</span>
                    <span className="text-white">{Math.round(systemData.uptime_seconds / 60)}m</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-mono text-text-secondary">
                    <span>Memory</span>
                    <span className="text-white">{systemData.memory_mb}MB</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-mono text-text-secondary">
                    <span>Online</span>
                    <span className="text-green-400">{systemData.connectors_online}/{systemData.connectors_total}</span>
                 </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

const PersonaCard = ({ persona, index }: { persona: Persona, index: number }) => {
  const load = derivedLoad(persona.name);
  const role = deriveRole(persona);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <GlassCard className="h-full flex flex-col group hover:border-indigo-500/30 transition-all cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 group-hover:bg-indigo-500/10 transition-colors">
            <Brain className="text-indigo-400" size={20} />
          </div>
          <span className="text-[10px] font-mono text-text-secondary">#{String(index + 1).padStart(3, '0')}</span>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-bold mb-1 group-hover:text-indigo-400 transition-colors">{persona.name}</h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-500/70">{role}</p>
        </div>

        {persona.system_prompt && (
          <p className="text-xs text-text-secondary line-clamp-2 mb-6 italic leading-relaxed">
            "{persona.system_prompt}"
          </p>
        )}

        <div className="mt-auto space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
              <span className="text-text-secondary">Cognitive Load</span>
              <span className={load > 70 ? 'text-red-400' : 'text-indigo-400'}>{load}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${load}%` }}
                 className={`h-full ${load > 70 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]'}`}
               />
            </div>
          </div>

          <button className="w-full py-2 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all">
            Deploy Focus
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default Council;
