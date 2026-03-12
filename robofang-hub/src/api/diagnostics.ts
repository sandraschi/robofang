const BRIDGE_BASE_URL = 'http://localhost:10871';

export interface SubstrateHeartbeat {
  status: string;
  integrity: string;
  council_active: boolean;
  fleet_node_count: number;
  system_pressure: { cpu_percent: number; memory_percent: number };
  heartbeat_latency_ms: number;
  timestamp: string;
}

export interface Discovery {
  id: string;
  type: string;
  description: string;
  timestamp: number;
}

export interface HealthReport {
  success: boolean;
  cohesion_score: number;
  risk_level: string;
  anomalies: string[];
  discoveries: Discovery[];
}

export const diagnosticsApi = {
  async getHeartbeat(): Promise<SubstrateHeartbeat | null> {
    try {
      const resp = await fetch(`${BRIDGE_BASE_URL}/api/diagnostics/heartbeat`);
      if (!resp.ok) return null;
      return await resp.json();
    } catch (err) {
      return null;
    }
  },

  async runForensics(): Promise<{ success: boolean; analysis: string }> {
    try {
      const resp = await fetch(`${BRIDGE_BASE_URL}/api/diagnostics/forensics`, { method: 'POST' });
      return await resp.json();
    } catch (err) {
      return { success: false, analysis: 'Forensic sweep failed: Bridge unreachable.' };
    }
  },

  async getFleetHealth(): Promise<HealthReport | null> {
    try {
      const resp = await fetch('http://localhost:10872/supervisor/fleet/health');
      if (!resp.ok) return null;
      return await resp.json();
    } catch (err) {
      return null;
    }
  }
};
