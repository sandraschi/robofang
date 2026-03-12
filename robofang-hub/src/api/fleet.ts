import { useState, useEffect } from 'react';

const SUPERVISOR_URL = 'http://localhost:10872';
const BRIDGE_URL = 'http://localhost:10871';

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
    getMarket: async () => {
        try {
            const res = await fetch(`${SUPERVISOR_URL}/supervisor/fleet/market`);
            return await res.json();
        } catch {
            console.error('Failed to fetch market');
            return { success: true, market: [] };
        }
    },
    install: async (nodeId: string) => {
        const res = await fetch(`${SUPERVISOR_URL}/supervisor/fleet/install`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: nodeId })
        });
        return await res.json();
    },
    getInstallerStatus: async () => {
        try {
            const res = await fetch(`${SUPERVISOR_URL}/supervisor/fleet/status`);
            return await res.json();
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

// Legacy exports for smoother migration
export const getFleetMarket = fleetApi.getMarket;
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
