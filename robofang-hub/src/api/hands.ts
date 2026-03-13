const BRIDGE_URL = 'http://localhost:10871';

export interface HandInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  active: boolean;
  last_run: number | null;
  next_run: number | null;
  pulse_interval: number;
  has_skill_content: boolean;
}

export interface HandsListResponse {
  success: boolean;
  hands: HandInfo[];
}

export interface ToolMappingResponse {
  success: boolean;
  mapping: Record<string, { connector: string; tool: string }>;
}

export const handsApi = {
  list: async (): Promise<HandsListResponse> => {
    const res = await fetch(`${BRIDGE_URL}/api/hands`);
    const data = await res.json();
    return res.ok ? data : { success: false, hands: [] };
  },
  activate: async (handId: string): Promise<{ success: boolean; id: string; active: boolean }> => {
    const res = await fetch(`${BRIDGE_URL}/api/hands/${encodeURIComponent(handId)}/activate`, {
      method: 'POST',
    });
    return await res.json();
  },
  pause: async (handId: string): Promise<{ success: boolean; id: string; active: boolean }> => {
    const res = await fetch(`${BRIDGE_URL}/api/hands/${encodeURIComponent(handId)}/pause`, {
      method: 'POST',
    });
    return await res.json();
  },
  getToolMapping: async (): Promise<ToolMappingResponse> => {
    const res = await fetch(`${BRIDGE_URL}/api/hands/tool-mapping`);
    const data = await res.json();
    return res.ok ? data : { success: false, mapping: {} };
  },
};
