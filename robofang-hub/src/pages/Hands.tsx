import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Hand,
  RefreshCw,
  Play,
  Pause,
  Settings2,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { handsApi, type HandInfo } from '../api/hands';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Hands: React.FC = () => {
  const [hands, setHands] = useState<HandInfo[]>([]);
  const [mapping, setMapping] = useState<Record<string, { connector: string; tool: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);

  const fetchHands = useCallback(async () => {
    try {
      const res = await handsApi.list();
      if (res.success) setHands(res.hands);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load hands');
    }
  }, []);

  const fetchMapping = useCallback(async () => {
    try {
      const res = await handsApi.getToolMapping();
      if (res.success) setMapping(res.mapping);
    } catch {
      setMapping({});
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchHands(), fetchMapping()]);
    setLoading(false);
  }, [fetchHands, fetchMapping]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleActivate = async (id: string) => {
    setTogglingId(id);
    try {
      const res = await handsApi.activate(id);
      if (res.success) await fetchHands();
    } finally {
      setTogglingId(null);
    }
  };

  const handlePause = async (id: string) => {
    setTogglingId(id);
    try {
      const res = await handsApi.pause(id);
      if (res.success) await fetchHands();
    } finally {
      setTogglingId(null);
    }
  };

  const formatTs = (ts: number | null) => {
    if (ts == null) return '—';
    try {
      return new Date(ts * 1000).toLocaleString(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Hand className="w-7 h-7 text-amber-400" />
            Autonomous Hands
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Scheduled agents (OpenFang-compatible). Activate or pause; tool mapping drives MCP calls.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAll}
          disabled={loading}
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <Card className="bg-slate-950/60 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-lg text-slate-200">Registered hands</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && hands.length === 0 ? (
            <div className="text-slate-500 text-sm py-8">Loading...</div>
          ) : hands.length === 0 ? (
            <div className="text-slate-500 text-sm py-8">
              No hands registered. Add plugins under <code className="text-slate-400">plugins/</code> or{' '}
              <code className="text-slate-400">plugins/bundled/</code> and restart the bridge.
            </div>
          ) : (
            <ul className="space-y-3">
              {hands.map((h) => (
                <motion.li
                  key={h.id}
                  layout
                  className="flex flex-col rounded-lg border border-slate-700/50 bg-slate-900/40 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white">{h.name}</span>
                        <Badge
                          variant="outline"
                          className={
                            h.active
                              ? 'border-emerald-500/40 text-emerald-400'
                              : 'border-slate-600 text-slate-500'
                          }
                        >
                          {h.active ? 'Active' : 'Paused'}
                        </Badge>
                        {h.has_skill_content && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
                            <BookOpen className="w-2.5 h-2.5 mr-1" />
                            SKILL
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-1">{h.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-slate-500">
                        <span>Category: {h.category}</span>
                        <span>Pulse: {h.pulse_interval}s</span>
                        {h.last_run != null && <span>Last run: {formatTs(h.last_run)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {h.active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePause(h.id)}
                          disabled={togglingId === h.id}
                          className="border-slate-600 text-slate-300"
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(h.id)}
                          disabled={togglingId === h.id}
                          className="border-emerald-600 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-950/60 border-slate-700/50">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setShowMapping((s) => !s)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
              {showMapping ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <Settings2 className="w-5 h-5 text-amber-400" />
              OpenFang tool mapping
            </CardTitle>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Maps hand tool names to MCP connector + tool. Edit configs/openfang_tool_mapping.json and restart.
          </p>
        </CardHeader>
        {showMapping && (
          <CardContent>
            {Object.keys(mapping).length === 0 ? (
              <p className="text-slate-500 text-sm">No mapping loaded.</p>
            ) : (
              <div className="rounded border border-slate-700/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/60 text-slate-400 text-left">
                      <th className="px-4 py-2 font-medium">OpenFang tool</th>
                      <th className="px-4 py-2 font-medium">Connector</th>
                      <th className="px-4 py-2 font-medium">MCP tool</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(mapping).map(([name, { connector, tool }]) => (
                      <tr key={name} className="border-t border-slate-700/50 text-slate-300">
                        <td className="px-4 py-2 font-mono text-amber-400/90">{name}</td>
                        <td className="px-4 py-2">{connector}</td>
                        <td className="px-4 py-2 font-mono">{tool}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default Hands;
