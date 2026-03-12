import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Zap,
  Loader2,
  Database
} from 'lucide-react';
import { ollamaApi } from '../api/ollama';
import type { OllamaModel } from '../api/ollama';
import GlassCard from '../components/ui/GlassCard';

function fmtBytes(b: number) {
  if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB';
  return (b / 1e6).toFixed(0) + ' MB';
}

const LLM: React.FC = () => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    setError(null);
    try {
      const list = await ollamaApi.getModels();
      setModels(list);
      if (list.length && !selected) setSelected(list[0].name);
    } catch {
      setModels([{ name: 'Ollama Offline', size: 0, modified_at: new Date().toISOString() }]);
      setError('Ollama Bridge Offline');
    } finally {
      setLoadingModels(false);
    }
  }, [selected]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleLoadModel = async () => {
    if (!selected) return;
    setLoadingModel(true);
    try {
      await ollamaApi.loadModel(selected);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModel(false);
    }
  };

  const handleRunTest = async () => {
    if (!prompt.trim() || !selected) return;
    setTesting(true);
    setResponse(null);
    try {
      const r = await ollamaApi.generate(selected, prompt.trim());
      setResponse(r.response || '(empty response)');
    } catch (err) {
      console.error(err);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold font-gradient mb-2">LLM Console</h2>
          <p className="text-text-secondary text-sm">Managing local inference substrate and neural models.</p>
        </div>
        <button 
          onClick={loadModels}
          disabled={loadingModels}
          className="glass-panel-interactive px-4 py-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400"
        >
          <RefreshCw size={14} className={loadingModels ? 'animate-spin' : ''} />
          Refresh Registry
        </button>
      </header>

      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center gap-3">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-1 flex flex-col h-fit" title="Model Registry">
          <div className="space-y-4">
            {loadingModels ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                 <Loader2 size={32} className="text-indigo-500 animate-spin" />
                 <span className="text-[10px] uppercase font-black text-text-secondary tracking-widest">Polling Ollama...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {models.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => setSelected(m.name)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      selected === m.name
                        ? 'bg-indigo-500/20 border-indigo-500/40'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-sm font-bold font-mono truncate mr-2">{m.name}</span>
                       {selected === m.name && <CheckCircle2 size={14} className="text-indigo-400 shrink-0" />}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="px-2 py-0.5 rounded bg-black/40 text-[9px] font-black uppercase text-text-secondary border border-white/5">
                        {fmtBytes(m.size)}
                      </div>
                      {m.details?.parameter_size && (
                         <div className="px-2 py-0.5 rounded bg-purple-500/10 text-[9px] font-black uppercase text-purple-400 border border-purple-500/20">
                           {m.details.parameter_size}
                         </div>
                      )}
                    </div>
                  </button>
                ))}
                {!models.length && (
                  <p className="text-center text-text-secondary text-xs py-8">No models detected.</p>
                )}
              </div>
            )}
            
            {selected && (
              <button 
                onClick={handleLoadModel}
                disabled={loadingModel}
                className="w-full mt-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
              >
                {loadingModel ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Load into VRAM
              </button>
            )}
          </div>
        </GlassCard>

        <div className="lg:col-span-2 space-y-8">
           <GlassCard title="Inference Testing" className="flex flex-col min-h-[400px]">
              <div className="flex-1 flex flex-col gap-6">
                <div className="relative">
                  <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Enter analytical prompt..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-sm font-mono min-h-[200px] focus:border-indigo-500/50 outline-none transition-all resize-none shadow-inner"
                  />
                  <div className="absolute top-4 right-4 text-[10px] font-mono text-indigo-500/50 uppercase font-black">
                    {selected || 'No Model'}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={handleRunTest}
                    disabled={testing || !prompt.trim() || !selected}
                    className="px-8 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                  >
                    {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Execute Inference
                  </button>
                  {response && (
                    <button 
                      onClick={() => setResponse(null)}
                      className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-text-secondary text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {response && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-6 rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/10 text-sm leading-relaxed font-medium shadow-2xl"
                    >
                       <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-widest text-indigo-400/60">
                         <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                         Synthesis Result
                       </div>
                       <div className="whitespace-pre-wrap text-indigo-50/90 font-mono text-xs leading-relaxed">
                         {response}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
           </GlassCard>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl glass-panel flex items-center gap-4 border border-white/5 shadow-xl">
                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <Cpu size={24} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Compute Substrate</p>
                  <p className="text-sm font-bold">NVIDIA RTX 4090</p>
                </div>
              </div>
              <div className="p-6 rounded-3xl glass-panel flex items-center gap-4 border border-white/5 shadow-xl">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <Database size={24} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">VRAM Capacity</p>
                  <p className="text-sm font-bold">24GB GDDR6X</p>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LLM;
