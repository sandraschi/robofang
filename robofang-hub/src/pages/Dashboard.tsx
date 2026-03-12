import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Settings, Rocket, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Dashboard: React.FC = () => {
    const [installedCount, setInstalledCount] = useState<number | null>(null);

    useEffect(() => {
        fetch('/api/fleet/catalog')
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (data?.hands) {
                    const n = data.hands.filter((h: { installed?: boolean }) => h.installed === true).length;
                    setInstalledCount(n);
                } else {
                    setInstalledCount(-1);
                }
            })
            .catch(() => setInstalledCount(-1));
    }, []);

    const showOnboardingBanner = installedCount === 0;

    return (
        <div className="space-y-10 max-w-3xl mx-auto pb-20">
            <header className="space-y-4">
                <h1 className="text-3xl font-bold text-white tracking-tight">RoboFang</h1>
                <p className="text-slate-400 text-base leading-relaxed">
                    This hub lets you install and manage MCP servers (Blender, Plex, Robotics, and others). Each server runs locally and can expose tools and a web app.
                </p>
            </header>

            {showOnboardingBanner && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Rocket className="text-amber-400" size={22} />
                                Set up your first MCP servers
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Run onboarding to install MCP servers from the catalog (Blender, Plex, Robotics, etc.). You can add more later from Fleet.
                            </p>
                        </div>
                        <Link
                            to="/onboarding"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors shrink-0"
                        >
                            <Rocket size={18} />
                            Open Onboarding
                        </Link>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-slate-950/40 border-slate-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-white">What to do next</CardTitle>
                    <CardDescription className="text-slate-400 text-sm">
                        Depending on your setup, use one or more of these.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Link
                        to="/onboarding"
                        className="flex items-center justify-between p-4 rounded-lg border border-white/10 hover:border-amber-500/30 hover:bg-white/[0.02] transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                                <Rocket size={18} />
                            </div>
                            <div>
                                <span className="font-medium text-white block">Onboarding</span>
                                <span className="text-xs text-slate-500">Install MCP servers from the catalog (clone from GitHub and run setup).</span>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-500 group-hover:text-amber-400" />
                    </Link>
                    <Link
                        to="/fleet"
                        className="flex items-center justify-between p-4 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.02] transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-500/10 text-slate-400">
                                <Bot size={18} />
                            </div>
                            <div>
                                <span className="font-medium text-white block">Fleet</span>
                                <span className="text-xs text-slate-500">See installed servers, launch their web apps, or install more from the catalog.</span>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-500 group-hover:text-slate-400" />
                    </Link>
                    <Link
                        to="/settings"
                        className="flex items-center justify-between p-4 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.02] transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-500/10 text-slate-400">
                                <Settings size={18} />
                            </div>
                            <div>
                                <span className="font-medium text-white block">Settings</span>
                                <span className="text-xs text-slate-500">Configure the bridge, API, and other options.</span>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-500 group-hover:text-slate-400" />
                    </Link>
                </CardContent>
            </Card>

            {installedCount !== null && installedCount > 0 && (
                <p className="text-sm text-slate-500">
                    {installedCount} MCP server{installedCount !== 1 ? 's' : ''} installed. Use <Link to="/fleet" className="text-amber-400 hover:underline">Fleet</Link> to manage or launch their web apps.
                </p>
            )}
        </div>
    );
};

export default Dashboard;
