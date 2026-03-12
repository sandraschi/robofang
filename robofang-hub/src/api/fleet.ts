import { useState, useEffect } from 'react';

const SUPERVISOR_URL = 'http://localhost:10872';

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
    get: async (): Promise<FleetData> => {
        try {
            const response = await fetch(`${SUPERVISOR_URL}/fleet/status`);
            if (!response.ok) throw new Error('Status failed');
            return await response.json();
        } catch (err) {
            console.error('Fleet API Error:', err);
            // Mock data fallback
            return {
                success: true,
                summary: { connectors_online: 3, connectors_total: 8, agents_discovered: 12 },
                connectors: [
                    { id: 'c1', name: 'Alsergrund-Primary', type: 'supervisor', status: 'online', source: 'live', domain: 'system' },
                    { id: 'c2', name: 'Plex-Orchestrator', type: 'connector', status: 'online', source: 'config', domain: 'knowledge' },
                    { id: 'c3', name: 'Unitree-Link', type: 'bridge', status: 'online', source: 'live', domain: 'robotics_vr' },
                    { id: 'c4', name: 'Legacy-Vault', type: 'archive', status: 'offline', source: 'config', domain: 'system' }
                ],
                agents: [
                    { id: 'a1', name: 'Materialist-Bot', type: 'philosophy', status: 'discovered', source: 'federation', domain: 'comms', path: '/agents/materialist', capabilities: ['Debate', 'Reductionism', 'History'] },
                    { id: 'a2', name: 'Vortex-Artist', type: 'creative', status: 'discovered', source: 'federation', domain: 'creative', path: '/agents/vortex', capabilities: ['Design', 'Glassmorphism', 'Framer'] }
                ],
                domains: ['system', 'knowledge', 'robotics_vr', 'comms', 'creative']
            };
        }
    },
    onboard: async (agentId: string) => {
        const response = await fetch(`${SUPERVISOR_URL}/fleet/onboard/${agentId}`, { method: 'POST' });
        return await response.json();
    },
    getMarket: async () => {
        try {
            const res = await fetch(`${SUPERVISOR_URL}/fleet/market`);
            return await res.json();
        } catch {
            console.error('Failed to fetch market');
            return {
                success: true,
                market: [
                    { id: 'm1', name: 'DALL-E Node', description: 'Advanced image generation bridge.', port: 10890, repo_path: 'robofang/dalle-node', icon: 'palette', category: 'Creative' },
                    { id: 'm2', name: 'Whisper-Listener', description: 'Real-time speech-to-text substrate.', port: 10891, repo_path: 'robofang/whisper-listener', icon: 'mic', category: 'Comms' },
                    { id: 'm3', name: 'Docker-Guardian', description: 'Container health & security agency.', port: 10892, repo_path: 'robofang/docker-guardian', icon: 'shield', category: 'Infra' }
                ]
            };
        }
    },
    install: async (nodeId: string) => {
        const res = await fetch(`${SUPERVISOR_URL}/fleet/install/${nodeId}`, { method: 'POST' });
        return await res.json();
    },
    getInstallerStatus: async () => {
        try {
            const res = await fetch(`${SUPERVISOR_URL}/fleet/installer/status`);
            return await res.json();
        } catch {
            console.error('Failed to fetch install status');
            return { success: true, status: {} };
        }
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
