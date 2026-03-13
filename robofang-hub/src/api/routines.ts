const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:10871';

export interface Routine {
  id: string;
  name: string;
  time_local: string;
  recurrence: string;
  action_type: string;
  params: Record<string, unknown>;
  last_run: string | null;
  enabled?: boolean;
}

export interface RoutinesResponse {
  success: boolean;
  routines: Routine[];
}

export interface FromPhraseResponse {
  success: boolean;
  routine?: Routine;
  error?: string;
}

export const routinesApi = {
  list: async (): Promise<RoutinesResponse> => {
    const res = await fetch(`${BRIDGE_URL}/api/routines`);
    if (!res.ok) throw new Error('Failed to fetch routines');
    return res.json();
  },

  createFromPhrase: async (
    phrase: string,
    reportEmail?: string
  ): Promise<FromPhraseResponse> => {
    const res = await fetch(`${BRIDGE_URL}/api/routines/from-phrase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase: phrase.trim(), report_email: reportEmail || undefined }),
    });
    return res.json();
  },

  runNow: async (routineId: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`${BRIDGE_URL}/api/routines/${encodeURIComponent(routineId)}/run`, {
      method: 'POST',
    });
    return res.json();
  },
};

export interface HandStatus {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  active: boolean;
  last_run: number | null;
  next_run: number | null;
  metrics: Record<string, unknown>;
}

export interface HandsResponse {
  success: boolean;
  hands: HandStatus[];
}

export const handsApi = {
  list: async (): Promise<HandsResponse> => {
    const res = await fetch(`${BRIDGE_URL}/api/hands`);
    if (!res.ok) throw new Error('Failed to fetch hands');
    return res.json();
  },

  activate: async (handId: string): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch(`${BRIDGE_URL}/api/hands/${encodeURIComponent(handId)}/activate`, {
      method: 'POST',
    });
    return res.json();
  },

  pause: async (handId: string): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch(`${BRIDGE_URL}/api/hands/${encodeURIComponent(handId)}/pause`, {
      method: 'POST',
    });
    return res.json();
  },
};
