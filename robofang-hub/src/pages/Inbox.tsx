import React, { useState } from 'react';
import { Send, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { inboxApi, PRESET_MESSAGES } from '../api/inbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const Inbox: React.FC = () => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await inboxApi.send(message);
      setResult({ success: res.success, message: res.message ?? '' });
    } catch (e) {
      setResult({
        success: false,
        message: e instanceof Error ? e.message : 'Request failed',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-widest mb-4">
          <MessageSquare size={12} />
          <span>Testing &amp; demo</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
          <MessageSquare className="text-amber-500" />
          Start activity
        </h1>
        <p className="text-zinc-400 text-sm mt-2">
          Send a message to RoboFang&apos;s inbox. Schedule phrases (e.g. dawn patrol 7am daily) create routines; other text runs as a command. Use presets for quick demos or type your own.
        </p>
      </header>

      <Card className="bg-slate-950/60 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Prerecorded messages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-400 text-sm mb-3">Click to fill the box below, then Send (or edit first).</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_MESSAGES.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => setMessage(preset.message)}
                className="text-xs border-white/10 hover:border-amber-500/30 hover:text-amber-400"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-950/60 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g. dawn patrol 7am daily or ask a question..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="min-h-[100px]"
          />
          <Button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="gap-2"
          >
            {sending ? 'Sending…' : (
              <>
                <Send size={16} />
                Send to inbox
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className={`border ${result.success ? 'bg-emerald-950/30 border-emerald-500/20' : 'bg-red-950/20 border-red-500/20'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {result.success ? (
                <>
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  Reply
                </>
              ) : (
                <>
                  <AlertCircle size={18} className="text-red-400" />
                  Error
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap break-words text-zinc-300 font-sans">
              {result.message || '(empty)'}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Inbox;
