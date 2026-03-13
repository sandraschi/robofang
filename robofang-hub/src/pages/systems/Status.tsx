import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Database, Server, WifiOff, RotateCcw,
  Terminal, Loader2, Shield, User,
  ShieldAlert, Search, Cpu, Brain, Clock,
  Play, Square, RefreshCw, AlertTriangle
} from 'lucide-react';

import GlassCard from '../../components/ui/GlassCard';
import { systemApi, type SystemData } from '../../api/system';
import { supervisorApi, type SupervisorStatus } from '../../api/supervisor';
import { diagnosticsApi, type SubstrateHeartbeat } from '../../api/diagnostics';

// -- Types --
type BridgeState = 'loading' | 'online' | 'offline';

const Status: React.FC = () => {
  // States
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [supervisorStatus, setSupervisorStatus] = useState<SupervisorStatus | null>(null);
  const [heartbeat, setHeartbeat] = useState<SubstrateHeartbeat | null>(null);
  const [bridgeState, setBridgeState] = useState<BridgeState>('loading');
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [forensicPending, setForensicPending] = useState(false);
  const [forensicResult, setForensicResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Data Fetching
  const refreshData = useCallback(async () => {
    try {
      const [sys, sup, hb, lg] = await Promise.all([
        systemApi.getSystemData(),
        supervisorApi.getStatus(),
        diagnosticsApi.getHeartbeat(),
        supervisorApi.getLogs(50)
      ]);

      if (sys) {
        setSystemData(sys);
        setBridgeState('online');
        setLastSeen(new Date());
      } else {
        setBridgeState('offline');
      }

      setSupervisorStatus(sup);
      setHeartbeat(hb);
      setLogs(lg);
    } catch (err) {
      console.warn('Status refresh failed', err);
      setBridgeState('offline');
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Scroll logs to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Actions
  const handleSupervisorAction = async (action: 'start' | 'stop' | 'restart') => {
    let success = false;
    if (action === 'start') success = await supervisorApi.start();
    else if (action === 'stop') success = await supervisorApi.stop();
    else if (action === 'restart') success = await supervisorApi.restart();

    if (success) {
      setTimeout(refreshData, 1000);
    }
  };

  const runForensics = async () => {
    setForensicPending(true);
    setForensicResult(null);
    const result = await diagnosticsApi.runForensics();
    setForensicResult(result.analysis);
    setForensicPending(false);
  };

  // Helper for status colors
  const getAgentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'thinking': return 'text-cyan-400';
      case 'guarding': return 'text-emerald-400';
      case 'validating': return 'text-purple-400';
      default: return 'text-zinc-500';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ShieldAlert size={20} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">System Status</h1>
          </div>
          <p className="text-zinc-400 text-sm max-w-xl font-medium">
            Real-time bridge observability and MCP/robots heartbeat.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
            bridgeState === 'online' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${bridgeState === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Bridge {bridgeState === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
          {lastSeen && (
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
              Last Sync: {lastSeen.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {/* Connection Alert */}
      {bridgeState === 'offline' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-red-500/10"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10 text-red-500 animate-pulse">
              <WifiOff size={24} />
            </div>
            <div>
              <div className="text-lg font-bold text-white">Bridge Substrate Severed</div>
              <p className="text-zinc-400 text-sm">Communication with the main controller is down. Verify local bridge status.</p>
            </div>
          </div>
          <button 
            onClick={refreshData}
            className="px-6 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2"
          >
            <RotateCcw size={14} /> Attempt Re-Handshake
          </button>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'System Uptime', 
            value: systemData ? `${Math.floor(systemData.uptime_seconds / 3600)}h ${Math.floor((systemData.uptime_seconds % 3600) / 60)}m` : '---', 
            icon: Clock, 
            color: 'cyan' 
          },
          { 
            label: 'Connector Grid', 
            value: systemData ? `${systemData.connectors_online}/${systemData.connectors_total}` : '---', 
            icon: Database, 
            color: 'purple' 
          },
          { 
            label: 'Memory Load', 
            value: systemData ? `${systemData.memory_mb} MB` : '---', 
            icon: Cpu, 
            color: 'amber' 
          },
          { 
            label: 'Substrate Load', 
            value: heartbeat ? `${heartbeat.system_pressure.cpu_percent}%` : '---', 
            icon: Activity, 
            color: 'emerald' 
          },
        ].map((stat) => (
          <GlassCard key={stat.label} className="p-5 border-white/[0.05] hover:border-white/10 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-400`}>
                <stat.icon size={22} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{stat.label}</div>
                <div className="text-2xl font-black text-white tracking-tighter">{stat.value}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Council Panel */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-white flex items-center gap-3">
                <Brain size={18} className="text-cyan-400" />
                Council Deliberation
              </h2>
              <div className="flex items-center gap-2 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest">Coherent</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { name: 'Schipal', role: 'Architect', status: 'Thinking', color: 'cyan' },
                { name: 'Benny', role: 'Security', status: 'Guarding', color: 'emerald' },
                { name: 'Steve', role: 'Redundancy', status: 'Observing', color: 'zinc' },
                { name: 'Marion', role: 'Logic', status: 'Validating', color: 'purple' },
              ].map((agent) => (
                <div key={agent.name} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-cyan-500/20 transition-all flex flex-col items-center group text-center">
                  <div className={`w-12 h-12 rounded-full mb-3 border-2 border-${agent.color}-500/30 bg-${agent.color}-500/5 flex items-center justify-center text-${agent.color}-400 group-hover:scale-110 transition-transform shadow-lg shadow-${agent.color}-500/5`}>
                    <User size={20} />
                  </div>
                  <div className="text-xs font-black text-white">{agent.name}</div>
                  <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter mb-1">{agent.role}</div>
                  <div className={`text-[8px] font-black uppercase ${getAgentStatusColor(agent.status)}`}>{agent.status}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Supervisor Controls */}
          <GlassCard className="p-6 border-amber-500/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${supervisorStatus?.running ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  <Server size={24} />
                </div>
                <div>
                  <div className="text-lg font-bold text-white flex items-center gap-2">
                    Supervisor Controller
                    {supervisorStatus?.auto_restart && <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">Auto-Restart</span>}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    Status: {supervisorStatus?.state || 'Unknown'} | PID: {supervisorStatus?.pid || '---'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleSupervisorAction('start')}
                  disabled={supervisorStatus?.running}
                  className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Force Start"
                >
                  <Play size={18} fill="currentColor" />
                </button>
                <button 
                  onClick={() => handleSupervisorAction('stop')}
                  disabled={!supervisorStatus?.running}
                  className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Panic Stop"
                >
                  <Square size={18} fill="currentColor" />
                </button>
                <button 
                  onClick={() => handleSupervisorAction('restart')}
                  className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all font-bold flex items-center gap-2"
                >
                  <RefreshCw size={18} />
                  <span className="text-[10px] uppercase tracking-widest hidden sm:inline">Recycle Node</span>
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Logs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Terminal size={14} className="text-zinc-500" /> Execution Journal
              </h3>
              <div className="text-[9px] font-bold text-zinc-500 uppercase">Supervisor Stream • 5s Refresh</div>
            </div>
            <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden font-mono text-[10px] h-[350px] shadow-inner">
              <div className="h-full overflow-y-auto p-5 space-y-1 custom-scrollbar">
                {logs.length > 0 ? logs.map((line, i) => (
                  <div key={i} className="flex gap-4 group">
                    <span className="text-zinc-800 w-6 text-right shrink-0">{i+1}</span>
                    <span className={`
                      flex-1 break-all
                      ${line.includes('ERR') || line.includes('Fail') ? 'text-rose-400' : 
                        line.includes('SUCCESS') || line.includes('OK') ? 'text-emerald-400' : 
                        line.includes('INIT') || line.includes('Bridge') ? 'text-cyan-400' : 
                        line.includes('WARN') ? 'text-amber-400' : 'text-zinc-400'}
                    `}>
                      {line}
                    </span>
                  </div>
                )) : (
                  <div className="text-center py-20 text-zinc-700 italic">Reading encrypted log stream...</div>
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Heartbeat / Pressure */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
              <Activity size={18} className="text-amber-400" />
              Sensor Cohesion
            </h2>
            <div className="space-y-6">
              {[
                { label: 'CPU Substrate', value: heartbeat?.system_pressure.cpu_percent || 0, color: 'cyan' },
                { label: 'Memory Buffer', value: heartbeat?.system_pressure.memory_percent || 0, color: 'purple' },
                { label: 'Pulse Latency', value: heartbeat?.heartbeat_latency_ms || 0, max: 200, unit: 'ms', color: 'emerald' },
              ].map((bar) => (
                <div key={bar.label} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                    <span className="text-zinc-400">{bar.label}</span>
                    <span className="text-white">{bar.value}{bar.unit || '%'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden border border-white/[0.02]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((bar.value / (bar.max || 100)) * 100, 100)}%` }}
                      className={`h-full bg-${bar.color}-500 shadow-[0_0_8px_rgba(var(--${bar.color}-rgb),0.5)]`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Forensics */}
          <GlassCard className="p-6 bg-gradient-to-br from-emerald-500/[0.03] to-cyan-500/[0.03] border-emerald-500/10">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
              <Search size={18} className="text-emerald-400" />
              Forensic Triage
            </h2>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-6 font-medium">
              Initiate an automated cross-substrate scan to detect logic collisions or sensor drift.
            </p>
            <button 
              onClick={runForensics}
              disabled={forensicPending}
              className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg ${
                forensicPending 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5' 
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 active:scale-[0.98] hover:shadow-emerald-500/10'
              }`}
            >
              {forensicPending ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              {forensicPending ? 'Analyzing...' : 'Start Sweep'}
            </button>

            <AnimatePresence>
              {forensicResult && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 p-4 rounded-xl bg-black/40 border border-emerald-500/20 font-mono text-[9px] text-emerald-400/80 whitespace-pre-wrap leading-relaxed shadow-inner"
                >
                  {forensicResult}
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* Connector List */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-white mb-6">Connector Health</h2>
            <div className="space-y-4">
              {systemData ? Object.entries(systemData.connectors).map(([id, info]) => (
                <div key={id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] group hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${info.online ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 group-hover:bg-rose-500/20'}`}>
                      <Server size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{id}</div>
                      <div className="text-[9px] text-zinc-600 font-mono uppercase tracking-tighter">{info.type}</div>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${info.online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {info.online ? 'OK' : 'FAIL'}
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center py-10 text-center space-y-3">
                  <AlertTriangle size={24} className="text-zinc-700" />
                  <div className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">No Active Links</div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Status;
