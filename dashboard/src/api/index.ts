import axios from 'axios';

const API_BASE = 'http://localhost:10871';
const SUP_BASE = 'http://localhost:10872';

// Bridge API — short timeout: bridge-down detected fast
const api = axios.create({ baseURL: API_BASE, timeout: 4000 });

// Supervisor API — longer timeout: start/stop may take a few seconds
const sup = axios.create({ baseURL: SUP_BASE, timeout: 10000 });

// ── Bridge endpoints ──────────────────────────────────────────────────────────

export const askQuestion = async (
    message: string,
    persona: string = 'sovereign',
    use_rag: boolean = true,
    use_council: boolean = false,
) => {
    const response = await api.post('/ask', { message, persona, use_rag, use_council }, { timeout: 120000 });
    return response.data;
};

export const getPulseFeed = async () => {
    const response = await api.get('/feed');
    return response.data;
};

export const getPersonas = async () => {
    const response = await api.get('/personality/personas');
    return response.data;
};

export const getFleet = async () => {
    const response = await api.get('/fleet');
    return response.data;
};

export const getHealth = async () => {
    const response = await api.get('/health');
    return response.data;
};

// ── Local LLM (Ollama via Bridge) ─────────────────────────────────────────

export const getLlmModels = async () => {
    const response = await api.get('/api/llm/models', { timeout: 10000 });
    return response.data;
};

export const loadLlmModel = async (name: string) => {
    const response = await api.post('/api/llm/load', { name }, { timeout: 120000 });
    return response.data;
};

export const llmGenerate = async (model: string, prompt: string, stream = false) => {
    const response = await api.post('/api/llm/generate', { model, prompt, stream }, { timeout: 90000 });
    return response.data;
};

export const getHelpContent = async () => {
    const response = await api.get('/api/help');
    return response.data;
};

export { API_BASE };

export const getSystem = async () => {
    const response = await api.get('/system');
    return response.data;
};

export const getHomeStatus = async () => {
    const response = await api.get('/home');
    return response.data;
};

// ── Diagnostic endpoints (New SOTA-2026 Substrate) ──────────────────────────

export const getSubstrateHeartbeat = async () => {
    // Note: These would typically be proxied by the bridge or called directly
    // For this implementation, we'll assume the bridge proxies /api/diagnostics
    const response = await api.get('/api/diagnostics/heartbeat');
    return response.data;
};

export const runFleetForensics = async () => {
    const response = await api.post('/api/diagnostics/forensics');
    return response.data;
};

// ── Supervisor endpoints ───────────────────────────────────────────────────────
// These hit port 10866 (the supervisor), not the bridge itself.

export const getSupervisorStatus = async () => {
    const response = await sup.get('/supervisor/status');
    return response.data;
};

export const supervisorStart = async () => {
    const response = await sup.post('/supervisor/start');
    return response.data;
};

export const supervisorStop = async () => {
    const response = await sup.post('/supervisor/stop');
    return response.data;
};

export const supervisorRestart = async () => {
    const response = await sup.post('/supervisor/restart');
    return response.data;
};

export const getSupervisorLogs = async (n: number = 150) => {
    const response = await sup.get(`/supervisor/logs?n=${n}`);
    return response.data;
};

export const setSupervisorAutoRestart = async (enabled: boolean) => {
    const response = await sup.post('/supervisor/auto_restart', { enabled });
    return response.data;
};

export const getSupervisorHealth = async () => {
    const response = await sup.get('/supervisor/health');
    return response.data;
};
