const BRIDGE_BASE_URL = 'http://localhost:10871';

export interface DeliberationStep {
  id: number;
  timestamp: string;
  agent: string;
  type: string;
  content: string;
}

export const deliberationsApi = {
  async get(sinceId?: number): Promise<{ deliberations: DeliberationStep[]; latest_id: number }> {
    const url = sinceId
      ? `${BRIDGE_BASE_URL}/deliberations?since_id=${sinceId}`
      : `${BRIDGE_BASE_URL}/deliberations`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch deliberations');
    return await resp.json();
  }
};
