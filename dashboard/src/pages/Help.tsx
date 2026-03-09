import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HelpCircle,
    Book,
    Command,
    Shield,
    Zap,
    Cpu,
    Search,
    ChevronRight,
    Play,
    Terminal,
    MessageSquare,
    ExternalLink,
    Wrench,
} from 'lucide-react';
import { getHelpContent } from '../api';

interface GuideItem {
    id: string;
    title: string;
    description: string;
    category: 'basics' | 'orchestration' | 'mcp' | 'security';
    content: string;
    icon: React.ReactNode;
}

const guides: GuideItem[] = [
    {
        id: '1',
        title: 'Understanding Orchestration',
        description: 'How the council of agents coordinates complex workflows.',
        category: 'basics',
        content: 'RoboFang uses a Federated Agent model where specialized agents collaborate on tasks. The process involves Dispatching a requirement, Deliberating on a strategy, and Executing via MCP toolsets. This ensures high-latency reasoning is separated from low-latency actions.',
        icon: <Zap size={20} className="text-yellow-400" />
    },
    {
        id: '2',
        title: 'MCP Federation Guide',
        description: 'Protocols for connecting and managing disparate toolsets.',
        category: 'mcp',
        content: 'Model Context Protocol (MCP) servers act as standardized bridges to external data and tools. Use the Connectors page to monitor server health, latency, and available tools. You can restart or reconfigure connectors on the fly without system downtime.',
        icon: <Cpu size={20} className="text-blue-400" />
    },
    {
        id: '3',
        title: 'Security & Ethics Guardrails',
        description: 'How we maintain operational safety and behavioral integrity.',
        category: 'security',
        content: 'All agent outputs are filtered through a multi-stage security manager. This includes prompt injection detection, data exfiltration prevention, and a behavioral integrity check based on Sandras materialist philosophy. Audit logs are preserved in the Advanced Logger.',
        icon: <Shield size={20} className="text-emerald-400" />
    },
    {
        id: '4',
        title: 'Advanced CLI Usage',
        description: 'Mastering the terminal-based command patterns.',
        category: 'orchestration',
        content: 'While the GUI provides a visual overview, power users can utilize the Dashboard console for raw agent interaction. All commands follow the FastMCP sampling standard, allowing for autonomous orchestration of complex file and system workflows.',
        icon: <Terminal size={20} className="text-slate-400" />
    },
];

interface ApiHelpCategory {
    description: string;
    topics: Record<string, string>;
}

const Help: React.FC = () => {
    const [selectedGuide, setSelectedGuide] = useState<GuideItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [mcpHelp, setMcpHelp] = useState<Record<string, ApiHelpCategory> | null>(null);
    const [mcpHelpOpen, setMcpHelpOpen] = useState<string | null>(null);

    useEffect(() => {
        getHelpContent()
            .then((data) => setMcpHelp(data?.categories ?? null))
            .catch(() => setMcpHelp(null));
    }, []);

    const filteredGuides = guides.filter(g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <HelpCircle className="text-emerald-400" />
                        Orchestration Guide
                    </h1>
                    <p className="text-slate-400 mt-1">Documentation, tutorials, and system knowledge base.</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search documentation..."
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Guide List */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
                        <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-6">Available Modules</h2>
                        <div className="space-y-2">
                            {filteredGuides.map((guide) => (
                                <button
                                    key={guide.id}
                                    onClick={() => setSelectedGuide(guide)}
                                    className={`w-full text-left p-4 rounded-xl transition-all border ${selectedGuide?.id === guide.id
                                        ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.1)]'
                                        : 'bg-slate-950/20 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${selectedGuide?.id === guide.id ? 'bg-emerald-400/20' : 'bg-slate-900 border border-slate-800'}`}>
                                            {guide.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate">{guide.title}</div>
                                            <div className="text-[10px] uppercase font-mono mt-1 opacity-60 tracking-wider">Module: {guide.category}</div>
                                        </div>
                                        <ChevronRight size={16} className={selectedGuide?.id === guide.id ? 'opacity-100' : 'opacity-20'} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* MCP Tools & Agentic Workflow (from Bridge /api/help) */}
                    {mcpHelp && Object.keys(mcpHelp).length > 0 && (
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
                            <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Wrench size={12} /> MCP & Agentic Workflow
                            </h2>
                            <div className="space-y-2">
                                {Object.entries(mcpHelp).map(([catKey, cat]) => (
                                    <div key={catKey} className="border border-slate-800 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setMcpHelpOpen(mcpHelpOpen === catKey ? null : catKey)}
                                            className="w-full text-left px-4 py-3 flex items-center justify-between bg-slate-950/30 hover:bg-slate-800/30 transition-colors"
                                        >
                                            <span className="text-sm font-medium text-slate-300 capitalize">{catKey}</span>
                                            <ChevronRight size={14} className={`text-slate-500 transition-transform ${mcpHelpOpen === catKey ? 'rotate-90' : ''}`} />
                                        </button>
                                        {mcpHelpOpen === catKey && (
                                            <div className="px-4 py-3 border-t border-slate-800 space-y-2 text-xs text-slate-400">
                                                <p className="text-slate-300">{cat.description}</p>
                                                <ul className="list-disc list-inside space-y-1">
                                                    {Object.entries(cat.topics || {}).map(([topic, detail]) => (
                                                        <li key={topic}>
                                                            <span className="font-mono text-indigo-400">{topic}</span>: {detail}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Resources */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
                        <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-6">Quick Resources</h2>
                        <div className="space-y-4">
                            {[
                                { label: 'API Reference', icon: <Book size={16} /> },
                                { label: 'Command Glossary', icon: <Command size={16} /> },
                                { label: 'Community Forum', icon: <MessageSquare size={16} /> },
                                { label: 'Official GitHub', icon: <ExternalLink size={16} /> },
                            ].map((res, i) => (
                                <button key={i} className="flex items-center justify-between w-full group">
                                    <div className="flex items-center gap-3 text-sm text-slate-400 group-hover:text-emerald-400 transition-colors">
                                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 group-hover:border-emerald-400/30 transition-colors">
                                            {res.icon}
                                        </div>
                                        {res.label}
                                    </div>
                                    <ExternalLink size={12} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                        {selectedGuide ? (
                            <motion.div
                                key={selectedGuide.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 min-h-[500px] flex flex-col"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 rounded-2xl bg-emerald-400/5 border border-emerald-400/10 text-emerald-400">
                                        {selectedGuide.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{selectedGuide.title}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] uppercase font-bold tracking-wider">{selectedGuide.category}</span>
                                            <span className="text-slate-600 text-[10px] font-mono">• EXT: V1.4</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 text-slate-300 leading-relaxed text-lg italic border-l-2 border-emerald-400/30 pl-8 mb-8 mt-4">
                                    "{selectedGuide.content}"
                                </div>
                                <div className="mt-auto pt-8 border-t border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tracking-tighter uppercase italic">
                                        <Shield size={12} /> Verified by Security Guardian
                                    </div>
                                    <button className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all font-bold text-sm shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                                        <Play size={16} fill="currentColor" />
                                        Launch Simulation
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 border-dashed rounded-3xl p-8 min-h-[500px] flex flex-col items-center justify-center text-center space-y-4">
                                <div className="p-4 rounded-full bg-slate-800 animate-pulse">
                                    <HelpCircle size={40} className="text-slate-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Select a Module</h3>
                                    <p className="text-slate-500 mt-1 max-w-sm">Choose a module from the sidebar to view detailed documentation and launch interactive simulations.</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Help;
