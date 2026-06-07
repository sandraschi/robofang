import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Bot,
    Settings,
    Rocket,
    MessageSquare,
    Users,
    CalendarClock,
    Inbox,
    ChevronRight,
} from 'lucide-react';
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
                    Local orchestration hub: install MCP servers, give commands, start scheduled chains, and run the agent council—all from this app.
                </p>
            </header>

            {bridgeError ? (
                <Card className="border-amber-500/30 bg-amber-500/10">
                    <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-white">Bridge not ready yet</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                The backend can take up to a minute after <code className="text-xs bg-black/40 px-1 rounded">start_all.ps1</code>. Wait, then Retry. First start: 60–90 seconds.
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
                                Install MCP servers and optional Telegram/Discord/email. Then use the actions below to command RoboFang.
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
                                {installedCount} MCP server{installedCount !== 1 ? 's' : ''} installed. Use the agency actions below or open the Fleet page.
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

            {!bridgeError && (
                <section className="space-y-3">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Run RoboFang</h2>
                    <p className="text-xs text-slate-500">
                        Give commands, start scheduled chains, and get the council reasoning—all without editing config files.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <AgencyCard
                            to="/chat"
                            icon={<MessageSquare size={18} className="text-indigo-400" />}
                            title="Give commands"
                            description="Chat with the sovereign. Toggle Council for multi-agent reasoning."
                            cta="Open Chat"
                        />
                        <AgencyCard
                            to="/schedule"
                            icon={<CalendarClock size={18} className="text-emerald-400" />}
                            title="Start chains"
                            description="Add routines in plain language (e.g. dawn patrol 7am daily). Activate Routine Runner."
                            cta="Schedule"
                        />
                        <AgencyCard
                            to="/council"
                            icon={<Users size={18} className="text-violet-400" />}
                            title="Agent council"
                            description="See council personas, fleet pulse, and deliberation activity."
                            cta="Council"
                        />
                        <AgencyCard
                            to="/inbox"
                            icon={<Inbox size={18} className="text-amber-400" />}
                            title="Inbox & demos"
                            description="Send schedule phrases or commands (same path as Telegram/email hooks)."
                            cta="Start activity"
                        />
                    </div>
                </section>
            )}

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
                        Installed MCP servers: status, launch web apps, install more from the catalog.
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
                        LLM (Ollama/API), Telegram, Discord, email (SMTP), and fleet options.
                    </p>
                </Link>
            </div>
        </div>
    );
};

function AgencyCard({
    to,
    icon,
    title,
    description,
    cta,
}: {
    to: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    cta: string;
}) {
    return (
        <Link
            to={to}
            className="group block p-4 rounded-xl border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-colors"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-white/5">{icon}</div>
                    <span className="font-semibold text-white text-sm">{title}</span>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 shrink-0 mt-1" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">{description}</p>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{cta}</span>
        </Link>
    );
}

export default Dashboard;
