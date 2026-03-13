import { useState, useEffect } from 'react';

const SUPERVISOR_URL = 'http://localhost:10872';
/** Same-origin so Vite proxy (/api -> bridge :10871) works; avoids CORS. */
const BRIDGE_URL = '';

export interface AgentInfo {
  id: string;
  name: string;
  status: 'active' | 'slumbering' | 'offline';
  description: string;
  tags: string[];
}

export interface FleetConnector {
    id: string;
    name: string;
    type: string;
    status: 'online' | 'offline' | 'discovered';
    source: 'live' | 'config' | 'federation';
    domain: string;
    enabled?: boolean;
    /** Backend URL for MCP (bridge uses for status/tools). */
    backend_url?: string;
    /** Webapp URL — open or start from card. */
    frontend_url?: string;
    /** Repo path for launch-webapp (bridge only). */
    repo_path?: string;
    /** Server status from MCP status tool (e.g. Blender running, installed). Fetched on demand. */
    server_status?: string | null;
}

export interface FleetAgent {
    id: string;
    name: string;
    type: string;
    status: 'discovered';
    source: 'federation';
    domain: string;
    path: string;
    capabilities: string[];
}

export interface FleetSummary {
    connectors_online: number;
    connectors_total: number;
    agents_discovered: number;
}

export interface FleetData {
    success: boolean;
    summary: FleetSummary;
    connectors: FleetConnector[];
    agents: FleetAgent[];
    domains: string[];
}

export const fleetApi = {
    /** Fleet list from bridge (connectors + agents). Use bridge, not supervisor. */
    get: async (): Promise<FleetData> => {
        try {
            const response = await fetch(`${BRIDGE_URL}/fleet`);
            if (!response.ok) throw new Error('Fleet failed');
            return await response.json();
        } catch (err) {
            console.error('Fleet API Error:', err);
            return {
                success: true,
                summary: { connectors_online: 0, connectors_total: 0, agents_discovered: 0 },
                connectors: [],
                agents: [],
                domains: []
            };
        }
    },
    /** Server status from MCP status tool (e.g. Blender running/installed). */
    getConnectorStatus: async (connectorId: string): Promise<{ success: boolean; server_status: string | null }> => {
        try {
            const response = await fetch(`${BRIDGE_URL}/api/connectors/${encodeURIComponent(connectorId)}/status`);
            if (!response.ok) return { success: false, server_status: null };
            return await response.json();
        } catch {
            return { success: false, server_status: null };
        }
    },
    /** Start webapp for a connector (optional; repo_path from fleet). */
    launchWebapp: async (repoPath: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await fetch(`${BRIDGE_URL}/api/fleet/launch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_path: repoPath })
            });
            const data = await response.json();
            return { success: response.ok && data?.success, message: data?.message };
        } catch (e) {
            return { success: false, message: (e as Error)?.message };
        }
    },
    onboard: async (agentId: string) => {
        const response = await fetch(`${SUPERVISOR_URL}/fleet/onboard/${agentId}`, { method: 'POST' });
        return await response.json();
    },
    /** Catalog of installable MCP servers. Uses GET /api/fleet/catalog (returns hands + catalog with port, repo_path). */
    getCatalog: async () => {
        try {
            const res = await fetch(`${BRIDGE_URL}/api/fleet/catalog`);
            const text = await res.text();
            let data: { success?: boolean; hands?: unknown[]; catalog?: unknown[]; error?: string; detail?: string | { msg: string }[] } = {};
            if (text && text.trim()) {
                try {
                    data = JSON.parse(text) as typeof data;
                } catch {
                    return {
                        success: false,
                        catalog: [],
                        error: `Bridge returned non-JSON (status ${res.status}). Check bridge logs.`
                    };
                }
            } else {
                return {
                    success: false,
                    catalog: [],
                    error: `Bridge returned empty response (status ${res.status}). Restart bridge and retry.`
                };
            }
            const list = (res.ok && data.catalog && Array.isArray(data.catalog) ? data.catalog : []) as { id: string; name: string; description: string; port: number; repo_path: string; icon: string; category: string }[];
            const success = res.ok && data.success !== false;
            const detail = typeof data.detail === 'string' ? data.detail : Array.isArray(data.detail) && data.detail[0]?.msg ? (data.detail as { msg: string }[]).map(d => d.msg).join('; ') : null;
            const errorMessage = data.error ?? detail ?? (success ? undefined : 'Bridge returned an error.');
            return {
                success,
                catalog: list,
                error: errorMessage ?? undefined
            };
        } catch (e) {
            console.error('Failed to fetch catalog', e);
            return { success: false, catalog: [], error: (e as Error)?.message ?? 'Request failed' };
        }
    },
    /** Install selected hand(s) via bridge onboard (clone + deps + install script). Returns full response with results array. */
    install: async (nodeId: string) => {
        try {
            const res = await fetch(`${BRIDGE_URL}/api/fleet/onboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hand_ids: [nodeId] })
            });
            const data = await res.json();
            if (!res.ok) return { success: false, error: data?.detail ?? 'Install failed', results: [] };
            const result = data.results?.[0];
            return {
                success: result?.success ?? data.success,
                message: result?.message ?? data.message,
                error: result?.success === false ? result?.message : undefined,
                results: data.results ?? []
            };
        } catch (e) {
            return { success: false, error: (e as Error)?.message ?? 'Request failed', results: [] };
        }
    },
    /** Install multiple hands in one request. Returns { success, results: Array<{ hand_id, success, message }> }. */
    installMany: async (handIds: string[]) => {
        try {
            const res = await fetch(`${BRIDGE_URL}/api/fleet/onboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hand_ids: handIds })
            });
            const data = await res.json();
            const results = data.results ?? [];
            const allOk = res.ok && data.success && results.every((r: { success?: boolean }) => r.success !== false);
            return {
                success: allOk,
                message: data.message,
                results: results as Array<{ hand_id: string; success: boolean; message?: string }>
            };
        } catch (e) {
            return {
                success: false,
                message: (e as Error)?.message ?? 'Request failed',
                results: handIds.map(id => ({ hand_id: id, success: false, message: (e as Error)?.message }))
            };
        }
    },
    getInstallerStatus: async () => {
        try {
            const res = await fetch(`${BRIDGE_URL}/api/fleet/catalog`);
            const data = await res.json();
            if (!res.ok || !data.success) return { success: true, status: {} };
            const status: Record<string, { status: string; logs: string[] }> = {};
            for (const h of data.hands ?? []) {
                status[h.id] = {
                    status: h.installed ? 'completed' : 'idle',
                    logs: []
                };
            }
            return { success: true, status };
        } catch {
            console.error('Failed to fetch install status');
            return { success: true, status: {} };
        }
    },
    /** Register connector in topology (federation_map) so it auto-starts on each robofang start. */
    registerConnector: async (connectorId: string, config: { enabled?: boolean; mcp_backend?: string; [k: string]: unknown }) => {
        const res = await fetch(`${BRIDGE_URL}/api/fleet/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category: 'connectors',
                id: connectorId,
                config: { enabled: true, ...config }
            })
        });
        return await res.json();
    },
    /** Start MCP server once (e.g. after install). Uses REPO_MAP on bridge. */
    launchConnector: async (connectorId: string) => {
        const res = await fetch(`${BRIDGE_URL}/api/connector/launch/${encodeURIComponent(connectorId)}`, {
            method: 'POST'
        });
        return await res.json();
    },
    getAgents: async () => {
        try {
            const res = await fetch(`${SUPERVISOR_URL}/hands/status`);
            return await res.json();
        } catch {
            console.error('Failed to fetch agents status');
            return {
                success: true,
                hands: [
                    { id: 'agent-robotics-01', name: 'Go2 Limb Controller', description: 'Direct motor orchestration for Unitree Go2.', is_active: true, last_pulse_timestamp: Date.now(), error_count: 0, tasks_completed: 1240 },
                    { id: 'agent-collector-01', name: 'Plex Metadata Scraper', description: 'Autonomous media analysis & ingestion.', is_active: false, last_pulse_timestamp: null, error_count: 2, tasks_completed: 450 }
                ]
            };
        }
    },
    activateAgent: async (id: string) => {
        const res = await fetch(`${SUPERVISOR_URL}/hands/${id}/activate`, { method: 'POST' });
        return await res.json();
    },
    pauseAgent: async (id: string) => {
        const res = await fetch(`${SUPERVISOR_URL}/hands/${id}/pause`, { method: 'POST' });
        return await res.json();
    }
};

export const getFleetCatalog = fleetApi.getCatalog;
export const installFleetNode = fleetApi.install;
export const getFleetInstallerStatus = fleetApi.getInstallerStatus;
export const getAgents = fleetApi.getAgents;
export const activateAgent = fleetApi.activateAgent;
export const pauseAgent = fleetApi.pauseAgent;

export const useFleetApi = () => {
    const [hands, setHands] = useState<AgentInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHands = async () => {
        try {
            setLoading(true);
            const data = await fleetApi.get();
            // Map connectors to legacy "hands" for compatibility if needed
            const mappedHands: AgentInfo[] = data.connectors.map(c => ({
                id: c.id,
                name: c.name,
                status: c.status === 'online' ? 'active' : c.status === 'discovered' ? 'slumbering' : 'offline',
                description: `${c.type} substrate in ${c.domain}.`,
                tags: [c.domain, c.type]
            }));
            setHands(mappedHands);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHands();
        const interval = setInterval(fetchHands, 30000);
        return () => clearInterval(interval);
    }, []);

    return { hands, loading, error, refresh: fetchHands };
};
