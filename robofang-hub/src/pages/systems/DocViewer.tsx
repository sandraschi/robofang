import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronLeft, BookOpen, Clock, Tag } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/button';
import axios from 'axios';

const DocViewer: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`http://localhost:10871/api/docs/${slug}`);
        if (response.data.success) {
          setDoc(response.data);
        } else {
          setError(response.data.error || 'Failed to load document');
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Document not found');
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchDoc();
  }, [slug]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <BookOpen className="text-zinc-700 animate-bounce" size={48} />
          <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Loading Archive...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" className="gap-2 text-zinc-400" onClick={() => navigate('/help')}>
          <ChevronLeft size={16} /> Back to Support
        </Button>
        <GlassCard className="p-12 text-center space-y-4 border-red-500/20 bg-red-500/5">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Access Denied</h2>
          <p className="text-zinc-400 font-medium">{error || 'The requested neural node is unavailable.'}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Button variant="ghost" className="h-8 px-2 gap-2 text-zinc-500 hover:text-white" onClick={() => navigate('/help')}>
            <ChevronLeft size={14} /> Back to Support
          </Button>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tight leading-none uppercase italic underline decoration-blue-500/50 decoration-4 underline-offset-8">
              {doc.title}
            </h1>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 pt-2">
              <span className="flex items-center gap-1.5"><Tag size={12} className="text-blue-500" /> Protocol-Archive</span>
              <span className="flex items-center gap-1.5"><Clock size={12} className="text-purple-500" /> Feb 2026</span>
            </div>
          </div>
        </div>
      </header>

      <GlassCard className="p-10 md:p-16 border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
        
        <article className="prose prose-invert prose-zinc max-w-none 
          prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-headings:text-white
          prose-h1:text-4xl prose-h2:text-2xl prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-4 prose-h2:mt-12
          prose-p:text-zinc-400 prose-p:leading-relaxed prose-p:font-medium
          prose-strong:text-white prose-strong:font-black
          prose-code:text-blue-400 prose-code:bg-blue-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-zinc-950/50 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-2xl
          prose-li:text-zinc-400 prose-li:font-medium
          prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-l-4 prose-blockquote:border-blue-500/50 prose-blockquote:bg-blue-500/5 prose-blockquote:py-2 prose-blockquote:rounded-r-xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {doc.content}
          </ReactMarkdown>
        </article>
      </GlassCard>

      <footer className="py-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
        <div className="flex items-center gap-3">
          <BookOpen className="text-blue-400" size={24} />
          <div>
            <p className="text-[10px] font-black text-white uppercase tracking-widest">RoboFang Archivist</p>
            <p className="text-[9px] font-bold text-zinc-500 uppercase">Vienna Technical Grid • 2026.03</p>
          </div>
        </div>
        <Button variant="outline" className="text-[9px] font-black uppercase tracking-widest border-white/10 bg-white/5 text-zinc-300">
          Request Archive Access
        </Button>
      </footer>
    </div>
  );
};

export default DocViewer;
