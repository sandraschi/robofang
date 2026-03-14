const BRIDGE_BASE_URL = 'http://localhost:10871';

export interface ChatResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: {
    model?: string;
    difficulty?: { level: string; score: number; suggest_council?: boolean };
  };
}

export const chatApi = {
  async ask(
    message: string,
    persona: string = 'sovereign',
    use_rag: boolean = true,
    use_council: boolean = false
  ): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeout = use_council ? 180000 : 60000; // 3 min council, 1 min single
    const t = setTimeout(() => controller.abort(), timeout);
    const resp = await fetch(`${BRIDGE_BASE_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, persona, use_rag, use_council }),
      signal: controller.signal,
    });
    clearTimeout(t);
    return await resp.json();
  }
};
