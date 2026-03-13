import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
  Play,
  RefreshCw,
  Clock,
  Bot,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { routinesApi, handsApi, type Routine, type HandStatus } from '../api/routines';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ROUTINE_RUNNER_ID = 'routine_runner';

const Schedule: React.FC = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [hands, setHands] = useState<HandStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phrase, setPhrase] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rRes, hRes] = await Promise.all([
        routinesApi.list(),
        handsApi.list().catch(() => ({ success: true, hands: [] as HandStatus[] })),
      ]);
      if (rRes.success) setRoutines(rRes.routines);
      if (hRes.success) setHands(hRes.hands);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const routineRunner = hands.find((h) => h.id === ROUTINE_RUNNER_ID);

  const handleAddFromPhrase = async () => {
    if (!phrase.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await routinesApi.createFromPhrase(phrase.trim(), reportEmail.trim() || undefined);
      if (res.success && res.routine) {
        setRoutines((prev) => [...prev, res.routine!]);
        setPhrase('');
        setReportEmail('');
      } else {
        setAddError(res.error || 'Could not create routine');
      }
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setAdding(false);
    }
  };

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    try {
      const res = await routinesApi.runNow(id);
      if (res.success) fetchData();
      else setAddError(res.error || 'Run failed');
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Run failed');
    } finally {
      setRunningId(null);
    }
  };

  const toggleRoutineRunner = async () => {
    if (!routineRunner) return;
    try {
      if (routineRunner.active) {
        await handsApi.pause(ROUTINE_RUNNER_ID);
      } else {
        await handsApi.activate(ROUTINE_RUNNER_ID);
      }
      fetchData();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Toggle failed');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-widest mb-4">
          <Calendar size={12} />
          <span>Calendaring</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
          <Calendar className="text-amber-500" />
          Schedule
        </h1>
        <p className="text-zinc-400 text-sm mt-2">
          Add routines in plain language (e.g. dawn patrol 7am daily, bug bash Friday 2pm weekly). The Routine Runner runs them at the set time.
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {addError && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 text-sm">
          <AlertCircle size={18} />
          {addError}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAddError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Routine Runner status */}
      <Card className="bg-slate-950/60 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot size={18} />
            Routine Runner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-zinc-400 text-sm">
            Scheduled routines only run when the Routine Runner hand is active. It checks every minute and runs any routine whose time matches (e.g. 7:00 for dawn patrol).
          </p>
          {routineRunner ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${routineRunner.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-sm text-zinc-300">
                  {routineRunner.active ? 'Active – routines will run at scheduled times' : 'Paused – routines will not run'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleRoutineRunner}
                className={routineRunner.active ? 'border-amber-500/30 text-amber-400' : 'border-emerald-500/30 text-emerald-400'}
              >
                {routineRunner.active ? 'Pause' : 'Activate'}
              </Button>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Routine Runner hand not found. Ensure the bridge is running.</p>
          )}
        </CardContent>
      </Card>

      {/* Add from phrase */}
      <Card className="bg-slate-950/60 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus size={18} />
            Add routine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-400 text-sm">
            Describe the schedule in plain language. Examples: &quot;dawn patrol 7am daily&quot;, &quot;bug bash Friday 2pm weekly&quot;.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="e.g. dawn patrol 7am daily"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFromPhrase()}
              className="bg-black/30 border-white/10 text-white placeholder:text-zinc-500 flex-1"
            />
            <Input
              placeholder="Report email (optional)"
              type="email"
              value={reportEmail}
              onChange={(e) => setReportEmail(e.target.value)}
              className="bg-black/30 border-white/10 text-white placeholder:text-zinc-500 w-full sm:w-56"
            />
            <Button
              onClick={handleAddFromPhrase}
              disabled={adding || !phrase.trim()}
              className="shrink-0"
            >
              {adding ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List routines */}
      <Card className="bg-slate-950/60 border-white/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock size={18} />
            Scheduled routines
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading…</p>
          ) : routines.length === 0 ? (
            <p className="text-zinc-500 text-sm">No routines yet. Add one above (e.g. dawn patrol 7am daily).</p>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence>
                {routines.map((r) => (
                  <motion.li
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-black/30 border border-white/5 p-4 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Calendar size={18} className="text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">{r.name}</div>
                        <div className="text-xs text-zinc-400 flex items-center gap-3 mt-0.5">
                          <span>{r.time_local}</span>
                          <span>{r.recurrence}</span>
                          <span className="text-zinc-500">{r.action_type}</span>
                          {r.last_run && (
                            <span className="text-emerald-500/80 flex items-center gap-1">
                              <CheckCircle2 size={10} />
                              Last run: {r.last_run}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRunNow(r.id)}
                      disabled={runningId === r.id}
                      className="shrink-0"
                    >
                      {runningId === r.id ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Play size={14} className="mr-1" />
                          Run now
                        </>
                      )}
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Schedule;
