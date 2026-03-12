import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download, CheckCircle2, XCircle, Loader2,
    ChevronRight, ShieldCheck, Box, Terminal, Info
} from 'lucide-react';
import { getFleetMarket, installFleetNode, getFleetInstallerStatus, fleetApi } from '../api/fleet';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MarketNode {
    id: string;
    name: string;
    description: string;
    port: number;
    repo_path: string;
    icon: string;
    category: string;
}

interface InstallStatus {
    status: 'installing' | 'completed' | 'failed';
    logs: string[];
}

/** Registry id (e.g. blender-mcp) -> topology connector id (e.g. blender) for REPO_MAP. */
function registryIdToConnectorId(registryId: string): string {
    return registryId.replace(/-mcp$/, '');
}

const Installer: React.FC = () => {
    const [market, setMarket] = useState<MarketNode[]>([]);
    const [statuses, setStatuses] = useState<Record<string, InstallStatus>>({});
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const postInstallDoneRef = useRef<Set<string>>(new Set());

    const fetchMarket = async () => {
        try {
            const res = await getFleetMarket();
            if (res.success && res.market) setMarket(res.market);
        } catch (e) {
            console.error('Failed to fetch market', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStatus = async () => {
        try {
            const res = await getFleetInstallerStatus();
            if (res.success && res.status) setStatuses(res.status);
        } catch (e) {
            console.error('Failed to fetch install status', e);
        }
    };

    useEffect(() => {
        fetchMarket();
        const timer = setInterval(fetchStatus, 2000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        market.forEach((node) => {
            const status = statuses[node.id];
            if (status?.status !== 'completed' || postInstallDoneRef.current.has(node.id)) return;
            postInstallDoneRef.current.add(node.id);
            const connectorId = registryIdToConnectorId(node.id);
            fleetApi
                .registerConnector(connectorId, {
                    mcp_backend: `http://localhost:${node.port}`
                })
                .then(() => fleetApi.launchConnector(connectorId))
                .catch((e) => console.error('Post-install register/launch failed', node.id, e));
        });
    }, [market, statuses]);

    const toggleSelect = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    const handleInstall = async () => {
        for (const id of selected) {
            await installFleetNode(id);
        }
        setSelected(new Set());
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    const isAnyInstalling = Object.values(statuses).some(s => s.status === 'installing');

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-32">
            <header className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <Badge variant="glass" className="bg-indigo-500/10 border-indigo-500/20 text-[9px] font-bold text-indigo-400 uppercase tracking-widest px-3 py-1">
                        System Provisioning
                    </Badge>
                </div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-5xl font-bold tracking-tighter text-white mb-3">
                            Fleet <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">Installer</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl font-medium leading-relaxed">
                            Orchestrate the deployment of associated MCP servers and webapps across your local substrate. Automated repository cloning and dependency resolution.
                        </p>
                    </div>
                    <AnimatePresence>
                        {selected.size > 0 && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, x: 20 }}
                                animate={{ scale: 1, opacity: 1, x: 0 }}
                                exit={{ scale: 0.9, opacity: 0, x: 20 }}
                            >
                                <Button
                                    onClick={handleInstall}
                                    className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-xl shadow-indigo-600/30 gap-3 text-sm uppercase tracking-widest"
                                >
                                    <Download size={20} />
                                    Install {selected.size} Node{selected.size > 1 ? 's' : ''}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-6">
                    <div className="relative w-20 h-20">
                         <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10" />
                         <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
                    </div>
                    <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em] animate-pulse">Querying Central Registry</p>
                </div>
            ) : (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                    {market.map(node => {
                        const status = statuses[node.id];
                        const isInstalling = status?.status === 'installing';
                        const isCompleted = status?.status === 'completed';
                        const isFailed = status?.status === 'failed';
                        const isSelected = selected.has(node.id);

                        return (
                            <motion.div
                                key={node.id}
                                variants={item}
                                onClick={() => !isInstalling && !isCompleted && toggleSelect(node.id)}
                                className="h-full"
                            >
                                <Card className={`group relative h-full flex flex-col bg-slate-950/40 border-slate-800 transition-all duration-300 cursor-pointer overflow-hidden ${isSelected ? 'border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-xl shadow-indigo-500/10' : 'hover:border-slate-700'} ${isCompleted ? 'opacity-50 cursor-default' : ''}`}>
                                    <CardHeader className="p-6 pb-4 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className={`p-3 rounded-2xl border transition-all duration-300 ${isSelected ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-slate-900 border-white/5 text-slate-500 group-hover:text-white'}`}>
                                                <Box size={24} />
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {isInstalling && <Loader2 size={16} className="text-indigo-400 animate-spin" />}
                                                {isCompleted && <CheckCircle2 size={16} className="text-emerald-400" />}
                                                {isFailed && <XCircle size={16} className="text-red-400" />}
                                                <Badge variant="glass" className="bg-slate-900/60 border-white/5 text-[9px] font-black uppercase tracking-widest px-2 h-5">
                                                    {node.category}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-bold text-white tracking-tight">{node.name}</CardTitle>
                                            <CardDescription className="text-xs text-slate-400 leading-relaxed mt-2 font-medium line-clamp-2">
                                                {node.description}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="px-6 flex-1 flex flex-col justify-end pt-0">
                                         <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.1em]">
                                            <span className="text-slate-600 font-mono">Substrate Port: {node.port}</span>
                                            <div className="flex items-center gap-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                                                <span className="tracking-widest">SELECT</span>
                                                <ChevronRight size={12} />
                                            </div>
                                        </div>
                                    </CardContent>

                                    {isInstalling && (
                                        <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 animate-pulse w-full shadow-[0_-4px_10px_rgba(99,102,241,0.5)]" />
                                    )}
                                </Card>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {/* Active Installation Log Console */}
            <AnimatePresence>
                {isAnyInstalling && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 z-50"
                    >
                        <Card className="bg-slate-950/80 border-slate-700/50 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="px-8 py-5 border-b border-white/[0.04] bg-white/[0.01]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                                            <Terminal size={14} />
                                        </div>
                                        <CardTitle className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Deploy Control Sequence</CardTitle>
                                    </div>
                                    <Badge variant="glass" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-mono text-[9px] font-bold tracking-tighter">
                                        SUBSTRATE_V3_INIT
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-40 px-8 py-6">
                                    <div className="font-mono text-[11px] text-slate-400 space-y-2 leading-relaxed">
                                        {Object.entries(statuses)
                                            .filter(([, s]) => s.status === 'installing')
                                            .flatMap(([id, s]) => s.logs.map(l => ({ id, msg: l })))
                                            .map((log, i) => (
                                                <div key={i} className="flex gap-4 group">
                                                    <span className="text-indigo-500/60 font-black shrink-0 tracking-tighter group-hover:text-indigo-400">[{log.id.toUpperCase()}]</span>
                                                    <span className="text-slate-300">{log.msg}</span>
                                                </div>
                                            ))
                                        }
                                        <div className="flex gap-4 animate-pulse">
                                            <span className="text-indigo-500/40 font-black shrink-0 tracking-tighter">[SYSTEM]</span>
                                            <span className="text-slate-500 italic">Awaiting buffer stream...</span>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </CardContent>
                            <CardFooter className="px-8 py-4 bg-white/[0.01] border-t border-white/[0.04] flex items-center gap-2">
                                <Info size={12} className="text-slate-600" />
                                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Secure installation active. Do not interrupt substrate link.</span>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Installer;
