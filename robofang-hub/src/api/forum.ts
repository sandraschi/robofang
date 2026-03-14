const BRIDGE_BASE_URL = 'http://localhost:10871';

export interface ForumPost {
  id: number;
  author: string;
  content: string;
  thread_id: number | null;
  created_at: string;
}

export const forumApi = {
  async getFeed(limit = 100): Promise<{ success: boolean; posts: ForumPost[] }> {
    const resp = await fetch(`${BRIDGE_BASE_URL}/forum/feed?limit=${limit}`);
    if (!resp.ok) throw new Error('Failed to fetch forum feed');
    return await resp.json();
  },

  async post(content: string, author = 'guest', threadId?: number): Promise<{ success: boolean; id?: number }> {
    const resp = await fetch(`${BRIDGE_BASE_URL}/forum/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, author, thread_id: threadId ?? null }),
    });
    if (!resp.ok) throw new Error('Failed to post');
    return await resp.json();
  },
};
