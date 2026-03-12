const SUPERVISOR_URL = 'http://localhost:10872';

export interface SupervisorStatus {
  state: 'running' | 'stopped' | 'crashed' | 'never_started';
  running: boolean;
  pid: number | null;
  exit_code: number | null;
  uptime_seconds: number | null;
  started_at: number | null;
  stopped_at: number | null;
  crash_count: number;
  auto_restart: boolean;
  log_lines: number;
  bridge_port: number;
  bridge_cmd: string;
}

export const supervisorApi = {
  async getStatus(): Promise<SupervisorStatus | null> {
    try {
      const resp = await fetch(`${SUPERVISOR_URL}/supervisor/status`);
      if (!resp.ok) return null;
      return await resp.json();
    } catch (err) {
      return null;
    }
  },

  async start(): Promise<boolean> {
    try {
      const resp = await fetch(`${SUPERVISOR_URL}/supervisor/start`, { method: 'POST' });
      return resp.ok;
    } catch (err) {
      return false;
    }
  },

  async stop(): Promise<boolean> {
    try {
      const resp = await fetch(`${SUPERVISOR_URL}/supervisor/stop`, { method: 'POST' });
      return resp.ok;
    } catch (err) {
      return false;
    }
  },

  async restart(): Promise<boolean> {
    try {
      const resp = await fetch(`${SUPERVISOR_URL}/supervisor/restart`, { method: 'POST' });
      return resp.ok;
    } catch (err) {
      return false;
    }
  },

  async setAutoRestart(enabled: boolean): Promise<boolean> {
    try {
      const resp = await fetch(`${SUPERVISOR_URL}/supervisor/auto_restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      return resp.ok;
    } catch (err) {
      return false;
    }
  },

  async getLogs(n: number = 100): Promise<string[]> {
    try {
      const resp = await fetch(`${SUPERVISOR_URL}/supervisor/logs?n=${n}`);
      const data = await resp.json();
      return Array.isArray(data) ? data : (data.lines || []);
    } catch (err) {
      return [];
    }
  }
};
