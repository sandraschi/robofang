import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Settings, Rocket, ChevronRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

const Dashboard: React.FC = () => {
    const [installedCount, setInstalledCount] = useState<number | null>(null);
    const [bridgeError, setBridgeError] = useState(false);

    const fetchCatalog = React.useCallback(() => {
        setBridgeError(false);
        fetch('/api/fleet/catalog')
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (data?.hands) {
                    const n = data.hands.filter((h: { installed?: boolean }) => h.installed === true).length;
                    setInstalledCount(n);
                } else {
                    setInstalledCount(0);
                }
            })
            .catch(() => {
                setInstalledCount(null);
                setBridgeError(true);
            });
    }, []);

    useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

    const loading = installedCount === null && !bridgeError;
    const needsOnboarding = installedCount === 0;

    return (
        <div className="space-y-8 max-w-2xl mx-auto pb-20">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-white tracking-tight">RoboFang</h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                    Local orchestration hub: install and run MCP servers (Blender, Plex, Robotics, etc.) and optional Telegram/Discord. Everything is configured in this app—no config files.
                </p>
            </header>

            {/* Single clear next step */}
            {bridgeError ? (
                <Card className="border-amber-500/30 bg-amber-500/10">
                    <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-white">Bridge not ready yet</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                The backend can take up to a minute to start after you run <code className="text-xs bg-black/40 px-1 rounded">start_all.ps1</code>. Wait a moment, then click Retry. If you just started RoboFang, give it 60–90 seconds.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={fetchCatalog}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors shrink-0"
                        >
                            Retry
                        </button>
                    </CardContent>
                </Card>
            ) : loading ? (
                <Card className="border-slate-700 bg-slate-950/40">
                    <CardContent className="p-6">
                        <p className="text-sm text-slate-400">Loading…</p>
                    </CardContent>
                </Card>
            ) : needsOnboarding ? (
                <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-white">Next: run the setup wizard</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                The wizard (onboarding) runs once: choose which MCP servers to install, and optionally Telegram/Discord. After that use the Fleet page to manage your servers.
                            </p>
                        </div>
                        <Link
                            to="/onboarding"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors shrink-0"
                        >
                            <Rocket size={18} />
                            Start setup wizard
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-slate-700 bg-slate-950/40">
                    <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-white">You’re set up</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                {installedCount} MCP server{installedCount !== 1 ? 's' : ''} installed. Open the Fleet page to manage them, launch web apps, or install more; Settings for LLM and comms.
                            </p>
                        </div>
                        <Link
                            to="/fleet"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors shrink-0"
                        >
                            <Bot size={18} />
                            Fleet page
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Short definitions: Fleet page and Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                    to="/fleet"
                    className="block p-4 rounded-xl border border-white/10 hover:border-amber-500/30 hover:bg-white/[0.02] transition-colors"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-slate-500/10 text-slate-400"><Bot size={16} /></div>
                        <span className="font-semibold text-white text-sm">Fleet page</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Your installed MCP servers. View status, launch web apps, or install more from the catalog.
                    </p>
                </Link>
                <Link
                    to="/settings"
                    className="block p-4 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/[0.02] transition-colors"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-slate-500/10 text-slate-400"><Settings size={16} /></div>
                        <span className="font-semibold text-white text-sm">Settings</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        LLM (Ollama/API), optional Telegram/Discord, and other system options. Change anytime.
                    </p>
                </Link>
            </div>
        </div>
    );
};

export default Dashboard;
