const BRIDGE_BASE_URL = 'http://localhost:10871';

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  details?: { 
    parameter_size?: string; 
    quantization_level?: string; 
    family?: string 
  };
}

export const ollamaApi = {
  async getModels(): Promise<OllamaModel[]> {
    try {
      const resp = await fetch(`${BRIDGE_BASE_URL}/api/llm/models`);
      if (!resp.ok) throw new Error('Ollama unreachable');
      const data = await resp.json();
      return data.models || [];
    } catch (err) {
      console.error('Error fetching models:', err);
      throw err;
    }
  },

  async loadModel(name: string): Promise<void> {
    const resp = await fetch(`${BRIDGE_BASE_URL}/api/llm/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!resp.ok) throw new Error('Failed to load model');
  },

  async generate(model: string, prompt: string, stream = false): Promise<{ response: string }> {
    const resp = await fetch(`${BRIDGE_BASE_URL}/api/llm/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream })
    });
    if (!resp.ok) throw new Error('Inference failed');
    return await resp.json();
  }
};
