import React, { useState, useEffect, useCallback } from 'react';
import {
    Settings, User, ShieldCheck, Globe, RefreshCw,
    Save, Plus, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Lock, Unlock
} from "lucide-react";
import axios from 'axios';

const BRIDGE = 'http://localhost:10871';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SecurityPolicy {
    subject: string;
    role: string;
    permissions: string[];
}

// ── Reusable section card ─────────────────────────────────────────────────────

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({
    title, icon, children, defaultOpen = true
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-[#16162a] border border-white/10 rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.03] transition-colors"
            >
                <div className="flex items-center gap-3 text-sm font-bold text-slate-200">
                    <span className="text-indigo-400">{icon}</span>
                    {title}
                </div>
                {open ? <ChevronUp size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
            </button>
            {open && <div className="px-6 pb-6 border-t border-white/[0.06]">{children}</div>}
        </div>
    );
};

// ── Personas section ──────────────────────────────────────────────────────────

const PersonasSection: React.FC = () => {
    const [personas, setPersonas] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPrompt, setNewPrompt] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await axios.get(`${BRIDGE}/personality/personas`);
            setPersonas(r.data?.personas ?? {});
        } catch { /* bridge offline */ }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async (name: string, prompt: string) => {
        setSaving(true);
        try {
            await axios.post(`${BRIDGE}/personality/persona`, { name, system_prompt: prompt });
            setSaved(name);
            setTimeout(() => setSaved(null), 2000);
            await load();
        } catch { /* noop */ }
        setSaving(false);
    };

    const add = async () => {
        if (!newName.trim() || !newPrompt.trim()) return;
        await save(newName.trim(), newPrompt.trim());
        setNewName('');
        setNewPrompt('');
    };

    return (
        <div className="mt-5 space-y-3">
            {loading ? (
                <div className="text-sm text-slate-500 py-4">Loading personas...</div>
            ) : Object.entries(personas).map(([name, prompt]) => (
                <div key={name} className="border border-white/[0.08] rounded-xl overflow-hidden">
                    <button
                        onClick={() => setExpanded(expanded === name ? null : name)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center">
                                <User size={13} className="text-indigo-400" />
                            </div>
                            <span className="text-sm font-semibold text-slate-200">{name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {saved === name && <CheckCircle2 size={13} className="text-emerald-400" />}
                            {expanded === name ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
                        </div>
                    </button>
                    {expanded === name && (
                        <div className="px-4 pb-4 border-t border-white/[0.06] pt-3 space-y-3">
                            <textarea
                                defaultValue={prompt}
                                rows={5}
                                className="w-full bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none resize-none font-mono transition-colors"
                                id={`prompt-${name}`}
                                aria-label={`${name} persona prompt editor`}
                                title={`${name} persona prompt editor`}
                            />
                            <button
                                onClick={() => {
                                    const el = document.getElementById(`prompt-${name}`) as HTMLTextAreaElement;
                                    if (el) save(name, el.value);
                                }}
                                disabled={saving}
                                className="flex items-center gap-2 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                            >
                                <Save size={12} /> Save Persona
                            </button>
                        </div>
                    )}
                </div>
            ))}

            {/* Add new */}
            <div className="border border-dashed border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Plus size={11} /> New Persona
                </div>
                <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Persona name (e.g. analyst)"
                    className="w-full bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                />
                <textarea
                    value={newPrompt}
                    onChange={e => setNewPrompt(e.target.value)}
                    placeholder="System prompt..."
                    rows={3}
                    className="w-full bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none resize-none transition-colors"
                />
                <button
                    onClick={add}
                    disabled={!newName.trim() || !newPrompt.trim() || saving}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-40"
                >
                    <Plus size={12} /> Add Persona
                </button>
            </div>
        </div>
    );
};

// ── Security section ──────────────────────────────────────────────────────────

const SecuritySection: React.FC = () => {
    const [subject, setSubject] = useState('guest');
    const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPolicy = async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await axios.get(`${BRIDGE}/security/policy/${subject}`);
            setPolicy(r.data?.policy ?? null);
        } catch (e: any) {
            setError(e?.response?.status === 404 ? 'No policy for this subject.' : 'Bridge unreachable.');
            setPolicy(null);
        }
        setLoading(false);
    };

    return (
        <div className="mt-5 space-y-4">
            <div className="flex gap-3">
                <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="subject (e.g. guest, admin)"
                    className="flex-1 bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                />
                <button
                    onClick={fetchPolicy}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                    {loading ? <RefreshCw size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                    Lookup
                </button>
            </div>

            {error && <div className="text-xs text-amber-400 flex items-center gap-2"><AlertTriangle size={12} />{error}</div>}

            {policy && (
                <div className="bg-[#0d0d16] border border-white/[0.08] rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Subject</div>
                            <div className="text-sm font-mono text-slate-200">{policy.subject}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Role</div>
                            <div className="text-sm font-mono text-indigo-400">{policy.role}</div>
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Permissions</div>
                        <div className="flex flex-wrap gap-1.5">
                            {policy.permissions.map(p => (
                                <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {p}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="border-t border-white/[0.06] pt-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Define / Update Policy</div>
                <PolicyForm />
            </div>
        </div>
    );
};

const PolicyForm: React.FC = () => {
    const [form, setForm] = useState({ subject: '', role: 'user', permissions: 'reasoning:ask,knowledge:search' });
    const [saving, setSaving] = useState(false);
    const [ok, setOk] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            await axios.post(`${BRIDGE}/security/policy`, {
                subject: form.subject,
                role: form.role,
                permissions: form.permissions.split(',').map(s => s.trim()).filter(Boolean),
            });
            setOk(true);
            setTimeout(() => setOk(false), 2500);
        } catch { /* noop */ }
        setSaving(false);
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="subject" className="bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors" />
                <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    placeholder="role" className="bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors" />
            </div>
            <input value={form.permissions} onChange={e => setForm(f => ({ ...f, permissions: e.target.value }))}
                placeholder="permissions (comma-separated)" className="w-full bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors" />
            <button onClick={submit} disabled={saving || !form.subject.trim()}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-40">
                {ok ? <><CheckCircle2 size={12} /> Saved</> : <><Save size={12} /> Apply Policy</>}
            </button>
        </div>
    );
};

// ── Federation info section ───────────────────────────────────────────────────

const FederationSection: React.FC = () => {
    const [health, setHealth] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${BRIDGE}/health`).then(r => setHealth(r.data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    return (
        <div className="mt-5">
            {loading && <div className="text-sm text-slate-500">Checking bridge...</div>}
            {health && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { label: 'Service', value: health.service },
                            { label: 'Version', value: health.version },
                            { label: 'Status', value: health.status },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-[#0d0d16] border border-white/[0.08] rounded-xl p-3">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{label}</div>
                                <div className="text-sm font-mono text-slate-200">{value}</div>
                            </div>
                        ))}
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Connector States</div>
                        <div className="space-y-1.5">
                            {Object.entries(health.connectors ?? {}).map(([name, active]) => (
                                <div key={name} className="flex items-center justify-between px-3 py-2 bg-[#0d0d16] border border-white/[0.06] rounded-xl">
                                    <span className="text-sm text-slate-300 font-medium">{name}</span>
                                    {active
                                        ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><Unlock size={10} /> Active</span>
                                        : <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500"><Lock size={10} /> Inactive</span>
                                    }
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main ──────────────────────────────────────────────────────────────────────

const SettingsPage: React.FC = () => (
    <div className="max-w-3xl mx-auto space-y-6">
        <div>
            <h1 className="text-3xl font-bold text-white font-heading flex items-center gap-3">
                <Settings className="text-indigo-400" />
                Settings
            </h1>
            <p className="text-slate-300 text-sm mt-1">Personas, security policies, and federation bridge configuration.</p>
        </div>

        <Section title="Personas" icon={<User size={16} />}>
            <PersonasSection />
        </Section>

        <Section title="Security Policies" icon={<ShieldCheck size={16} />} defaultOpen={false}>
            <SecuritySection />
        </Section>

        <Section title="Bridge Status" icon={<Globe size={16} />} defaultOpen={false}>
            <FederationSection />
        </Section>
    </div>
);

export default SettingsPage;
