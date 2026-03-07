import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, RefreshCw, Send, CheckCircle2, AlertTriangle, Cpu, Zap, Loader2 } from 'lucide-react';
import { getLlmModels, loadLlmModel, llmGenerate } from '../api';

interface OllamaModel {
    name: string;
    size: number;
    modified_at: string;
    details?: { parameter_size?: string; quantization_level?: string; family?: string };
}

function fmtBytes(b: number) {
    if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB';
    return (b / 1e6).toFixed(0) + ' MB';
}

const LLM: React.FC = () => {
    const [models, setModels]         = useState<OllamaModel[]>([]);
    const [loadingModels, setLoadingModels] = useState(true);
    const [ollamaError, setOllamaError]     = useState<string | null>(null);
    const [selected, setSelected]     = useState<string>('');
    const [prompt, setPrompt]         = useState('');
    const [response, setResponse]     = useState<string | null>(null);
    const [testing, setTesting]       = useState(false);
    const [testError, setTestError]   = useState<string | null>(null);
    const [loadingModel, setLoadingModel] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadModels = useCallback(async () => {
        setLoadingModels(true);
        setOllamaError(null);
        try {
            const r = await getLlmModels();
            const list: OllamaModel[] = r?.models ?? [];
            setModels(list);
            if (list.length && !selected) setSelected(list[0].name);
        } catch {
            setOllamaError('Ollama unreachable (Bridge proxy). Is Ollama running and Bridge up?');
        }
        setLoadingModels(false);
    }, [selected]);

    useEffect(() => {
        loadModels();
    }, [loadModels]);

    const doLoadModel = async () => {
        if (!selected) return;
        setLoadingModel(true);
        setLoadError(null);
        try {
            await loadLlmModel(selected);
        } catch (e: unknown) {
            setLoadError(e instanceof Error ? e.message : String(e));
        }
        setLoadingModel(false);
    };

    const runTest = async () => {
        if (!prompt.trim() || !selected) return;
        setTesting(true);
        setResponse(null);
        setTestError(null);
        try {
            const r = await llmGenerate(selected, prompt.trim(), false);
            setResponse(r?.response ?? '(empty response)');
        } catch (e: unknown) {
            setTestError(e instanceof Error ? e.message : String(e));
        }
        setTesting(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white font-heading flex items-center gap-3">
                        <Brain className="text-purple-400" />
                        LLM Console
                    </h1>
                    <p className="text-slate-300 text-sm mt-1">Local Ollama models — browse, select, and test inference directly.</p>
                </div>
                <button
                    onClick={loadModels}
                    disabled={loadingModels}
                    className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={13} className={loadingModels ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {ollamaError && (
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4">
                    <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
                    <div className="text-sm text-amber-300">{ollamaError}</div>
                </div>
            )}

            {/* Model grid */}
            {!ollamaError && (
                <div className="bg-[#16162a] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Cpu size={15} className="text-indigo-400" />
                            Installed Models
                        </h2>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {loadingModels ? '...' : `${models.length} found`}
                        </span>
                    </div>
                    <div className="p-4">
                        {loadingModels ? (
                            <div className="flex items-center gap-3 text-slate-500 py-6 justify-center text-sm">
                                <RefreshCw size={16} className="animate-spin" /> Querying Ollama...
                            </div>
                        ) : models.length === 0 ? (
                            <div className="text-center text-slate-500 text-sm py-8">No models installed. Run <code className="font-mono text-indigo-400">ollama pull llama3</code> to get started.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {models.map((m) => (
                                    <motion.button
                                        key={m.name}
                                        whileHover={{ y: -1 }}
                                        onClick={() => setSelected(m.name)}
                                        className={`text-left p-4 rounded-xl border transition-all ${
                                            selected === m.name
                                                ? 'bg-indigo-600/15 border-indigo-500/40 text-white'
                                                : 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="font-mono text-sm font-semibold leading-tight">{m.name}</div>
                                            {selected === m.name && <CheckCircle2 size={14} className="text-indigo-400 shrink-0 mt-0.5" />}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <span className="text-[10px] font-bold text-slate-500 bg-white/[0.05] border border-white/[0.07] px-1.5 py-0.5 rounded">
                                                {fmtBytes(m.size)}
                                            </span>
                                            {m.details?.parameter_size && (
                                                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                                                    {m.details.parameter_size}
                                                </span>
                                            )}
                                            {m.details?.quantization_level && (
                                                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                                                    {m.details.quantization_level}
                                                </span>
                                            )}
                                            {m.details?.family && (
                                                <span className="text-[10px] font-bold text-slate-400 bg-white/[0.04] border border-white/[0.07] px-1.5 py-0.5 rounded">
                                                    {m.details.family}
                                                </span>
                                            )}
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                        {selected && (
                            <div className="px-4 pb-4 flex items-center gap-3">
                                <button
                                    onClick={doLoadModel}
                                    disabled={loadingModel}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {loadingModel ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                                    {loadingModel ? 'Loading…' : 'Load into memory'}
                                </button>
                                {loadError && <span className="text-xs text-red-400">{loadError}</span>}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Test console */}
            <div className="bg-[#16162a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
                    <Zap size={15} className="text-yellow-400" />
                    <h2 className="text-sm font-bold text-slate-200">Inference Test</h2>
                    {selected && (
                        <span className="ml-auto text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                            {selected}
                        </span>
                    )}
                </div>
                <div className="p-5 space-y-4">
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Enter a test prompt..."
                        rows={4}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runTest(); }}
                        className="w-full bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none resize-none font-mono transition-colors"
                    />
                    <div className="flex items-center gap-3">
                        <button
                            onClick={runTest}
                            disabled={testing || !prompt.trim() || !selected}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-40 shadow-lg shadow-indigo-600/20"
                        >
                            {testing
                                ? <><RefreshCw size={13} className="animate-spin" /> Running...</>
                                : <><Send size={13} /> Run (Ctrl+Enter)</>
                            }
                        </button>
                        {response && (
                            <button onClick={() => setResponse(null)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                                Clear
                            </button>
                        )}
                    </div>

                    {testError && (
                        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            {testError}
                        </div>
                    )}

                    {response && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#0d0d16] border border-white/[0.08] rounded-xl p-4"
                        >
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <CheckCircle2 size={10} className="text-emerald-400" /> Response
                            </div>
                            <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">{response}</pre>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LLM;
