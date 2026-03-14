import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Loader2, Lock } from 'lucide-react';
import { forumApi, type ForumPost } from '../api/forum';
import GlassCard from '../components/ui/GlassCard';

const Forum: React.FC = () => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('guest');
  const [sending, setSending] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const res = await forumApi.getFeed();
      if (res.success && res.posts) setPosts(res.posts);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handlePost = async () => {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await forumApi.post(text, author);
      if (res.success) {
        setContent('');
        await loadFeed();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col gap-6">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400/80">
            <Lock size={12} />
            <span>Local only · no cloud</span>
          </div>
          <h2 className="text-3xl font-bold font-gradient flex items-center gap-3">
            <MessageCircle className="text-indigo-400" />
            Private forum
          </h2>
          <p className="text-text-secondary text-sm mt-1">
            Discussion feed stored on this hub only (Moltbook-style, sovereign).
          </p>
        </div>
      </header>

      <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden min-h-0 bg-black/10">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-text-secondary text-sm">
              No posts yet. Add one below.
            </div>
          ) : (
            posts.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold text-indigo-400">
                    {p.author}
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    {p.created_at}
                  </span>
                </div>
                <p className="text-sm text-text-primary whitespace-pre-wrap">
                  {p.content}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-5 border-t border-white/5 bg-black/20 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author"
              className="w-28 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono focus:border-indigo-500/50 outline-none"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a post..."
              rows={2}
              disabled={sending}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-indigo-500/50 outline-none resize-none placeholder:text-text-secondary/50"
            />
            <button
              type="button"
              onClick={handlePost}
              disabled={sending || !content.trim()}
              className="p-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white transition-all active:scale-95 disabled:opacity-50"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default Forum;
