import { useState, useEffect, useCallback } from 'react';

const BRIDGE_BASE_URL = 'http://localhost:10871';

export interface Persona {
  name: string;
  system_prompt?: string;
  role?: string;
  metadata?: Record<string, unknown>;
}

export const personalityApi = {
  async getPersonas(): Promise<Persona[]> {
    try {
      const resp = await fetch(`${BRIDGE_BASE_URL}/personality/personas`);
      if (!resp.ok) throw new Error('Failed to fetch personas');
      const data = await resp.json();
      const raw = data.personas;
      if (Array.isArray(raw)) {
        return raw;
      } else if (raw && typeof raw === 'object') {
        return Object.entries(raw).map(([name, val]) => ({
          name,
          ...(typeof val === 'object' && val !== null ? (val as object) : {}),
        }));
      }
      return [];
    } catch (err) {
      console.error('Error fetching personas:', err);
      return [];
    }
  }
};

export function usePersonalityApi() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await personalityApi.getPersonas();
      setPersonas(data);
    } catch (err) {
      setError('Bridge unreachable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  return { personas, loading, error, refresh };
}
