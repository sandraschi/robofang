/**
 * RoboFang Bridge API Connector
 * Provides unified connectivity to the Supervisor API and Substrate Controllers.
 */

const BRIDGE_BASE_URL = 'http://localhost:10871';

export interface BridgeStatus {
  online: boolean;
  version: string;
  uptime: number;
  substrates: {
    name: string;
    status: 'active' | 'idle' | 'error';
    latency: number;
  }[];
}

export const bridgeApi = {
  /**
   * Health check for the supervisor bridge.
   */
  async getStatus(): Promise<BridgeStatus> {
    try {
      const resp = await fetch(`${BRIDGE_BASE_URL}/status`);
      if (!resp.ok) throw new Error('Bridge unreachable');
      return await resp.json();
    } catch (err) {
      console.warn('Bridge offline or unreachable:', err);
      return {
        online: false,
        version: '0.0.0',
        uptime: 0,
        substrates: []
      };
    }
  },

  /**
   * Execute a command on the bridge.
   */
  async exec(command: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const resp = await fetch(`${BRIDGE_BASE_URL}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, args })
    });
    return await resp.json();
  },

  /**
   * Fetch telemetry pulse data.
   */
  async getPulse(): Promise<unknown> {
    const resp = await fetch(`${BRIDGE_BASE_URL}/pulse`);
    return await resp.json();
  }
};

export default bridgeApi;
