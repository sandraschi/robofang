import React, { useState, useEffect } from 'react';
import { Rocket, MessageCircle, Send, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const BRIDGE = 'http://localhost:10871';

interface CommsStatus {
    telegram_configured: boolean;
    discord_configured: boolean;
}

const OnboardingPage: React.FC = () => {
    const [status, setStatus] = useState<CommsStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [telegram_token, setTelegramToken] = useState('');
    const [telegram_chat_id, setTelegramChatId] = useState('');
    const [discord_webhook, setDiscordWebhook] = useState('');

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await axios.get<CommsStatus>(`${BRIDGE}/api/settings/comms`);
            setStatus(r.data);
        } catch {
            setStatus(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            await axios.post(`${BRIDGE}/api/settings/comms`, {
                telegram_token: telegram_token.trim() || undefined,
                telegram_chat_id: telegram_chat_id.trim() || undefined,
                discord_webhook: discord_webhook.trim() || undefined,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Save failed');
        }
        setSaving(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white font-heading flex items-center gap-3">
                    <Rocket className="text-indigo-400" />
                    Onboarding
                </h1>
                <p className="text-slate-300 text-sm mt-1">
                    Set up communications so RoboFang can send and receive commands via Telegram or Discord.
                </p>
            </div>

            {loading && (
                <div className="text-sm text-slate-500 py-4">Loading...</div>
            )}

            {!loading && (
                <div className="bg-[#16162a] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/[0.06]">
                        <div className="flex items-center gap-3 text-sm font-bold text-slate-200">
                            <MessageCircle className="text-indigo-400" size={16} />
                            Comms credentials
                        </div>
                    </div>
                    <div className="px-6 pb-6 pt-4 space-y-5">
                        {/* Telegram */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Telegram (optional)
                            </label>
                            {status?.telegram_configured && (
                                <div className="flex items-center gap-2 text-xs text-emerald-400 mb-1">
                                    <CheckCircle2 size={12} /> Configured (env or saved)
                                </div>
                            )}
                            <input
                                type="password"
                                value={telegram_token}
                                onChange={e => setTelegramToken(e.target.value)}
                                placeholder="Bot token (from @BotFather)"
                                className="w-full bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                            />
                            <input
                                value={telegram_chat_id}
                                onChange={e => setTelegramChatId(e.target.value)}
                                placeholder="Chat ID (e.g. from @userinfobot)"
                                className="w-full bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                            />
                        </div>

                        {/* Discord */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Discord (optional)
                            </label>
                            {status?.discord_configured && (
                                <div className="flex items-center gap-2 text-xs text-emerald-400 mb-1">
                                    <CheckCircle2 size={12} /> Configured (env or saved)
                                </div>
                            )}
                            <input
                                type="password"
                                value={discord_webhook}
                                onChange={e => setDiscordWebhook(e.target.value)}
                                placeholder="Webhook URL (Server Settings → Integrations → Webhooks)"
                                className="w-full bg-[#0d0d16] border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                            />
                        </div>

                        <p className="text-xs text-slate-500">
                            Leave a field empty to keep the current value. Values are stored securely and used for
                            command replies and notifications. You can also set env: ROBOFANG_TELEGRAM_TOKEN,
                            ROBOFANG_TELEGRAM_CHAT_ID, ROBOFANG_DISCORD_WEBHOOK.
                        </p>

                        {error && (
                            <div className="flex items-center gap-2 text-xs text-amber-400">
                                <AlertCircle size={12} /> {error}
                            </div>
                        )}

                        <button
                            onClick={save}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-40"
                        >
                            {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save</>}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-[#0d0d16] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    <Send size={12} /> Sending commands
                </div>
                <p className="text-sm text-slate-400">
                    To send a command via Telegram (or email), run a small bot or script that POSTs to{' '}
                    <code className="text-indigo-400 font-mono text-xs">/hooks/command</code> with{' '}
                    <code className="text-slate-300 font-mono text-xs">{'{"message": "your command", "reply_to": "telegram"}'}</code>.
                    See <strong>docs/COMMAND_VIA_EMAIL_TELEGRAM.md</strong> for details.
                </p>
            </div>
        </div>
    );
};

export default OnboardingPage;
