const BRIDGE_BASE_URL = 'http://localhost:10871';

export interface ChatResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: {
    model: string;
  };
}

export const chatApi = {
  async ask(
    message: string,
    persona: string = 'sovereign',
    use_rag: boolean = true,
    use_council: boolean = false
  ): Promise<ChatResponse> {
    const resp = await fetch(`${BRIDGE_BASE_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, persona, use_rag, use_council })
    });
    return await resp.json();
  }
};
