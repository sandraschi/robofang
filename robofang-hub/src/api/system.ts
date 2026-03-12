import { useState, useEffect, useCallback } from 'react';

const BRIDGE_BASE_URL = 'http://localhost:10871';

export interface ConnectorState {
  online: boolean;
  type: string;
}

export interface SystemData {
  connectors: Record<string, ConnectorState>;
  connectors_online: number;
  connectors_total: number;
  uptime_seconds: number;
  memory_mb: number;
}

export const systemApi = {
  async getSystemData(): Promise<SystemData | null> {
    try {
      const resp = await fetch(`${BRIDGE_BASE_URL}/system`);
      if (!resp.ok) throw new Error('Failed to fetch system data');
      return await resp.json();
    } catch (err) {
      console.error('Error fetching system data:', err);
      return null;
    }
  }
};

export function useSystemApi() {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await systemApi.getSystemData();
      setSystemData(data);
    } catch (err) {
      setError('System data fetch failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  return { systemData, loading, error, refresh };
}
