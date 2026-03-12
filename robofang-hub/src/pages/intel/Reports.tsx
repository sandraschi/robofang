import React from 'react';
import { FileText, Plus, FileDown, Eye, Clock, Share2, MoreVertical, Archive } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const Reports: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileText size={20} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Reports</h1>
          </div>
          <p className="text-zinc-400 text-sm max-w-xl font-medium">
            Synthesized intelligence briefings and mission summaries.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">
          <Plus size={16} /> Create Report
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          { title: 'Weekly Situational Awareness', date: '21 Mar 2026', items: 142, color: 'blue' },
          { title: 'Fleet Performance Audit', date: '19 Mar 2026', items: 28, color: 'emerald' },
          { title: 'Entity Extraction: Project Alpha', date: '18 Mar 2026', items: 12, color: 'purple' },
          { title: 'Regional Threat Assessment', date: '15 Mar 2026', items: 8, color: 'red' },
          { title: 'System Infrastructure Update', date: '12 Mar 2026', items: 34, color: 'amber' },
          { title: 'Knowledge Base Expansion Log', date: '10 Mar 2026', items: 245, color: 'cyan' },
        ].map((report, i) => (
          <GlassCard key={i} className="group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${report.color}-500/5 blur-3xl -mr-12 -mt-12 transition-all group-hover:bg-${report.color}-500/20`} />
            <div className="p-6 space-y-4 relative z-10">
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-xl bg-${report.color}-500/10 text-${report.color}-400`}>
                  <FileText size={20} />
                </div>
                <button className="text-zinc-600 hover:text-white transition-colors">
                  <MoreVertical size={18} />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">{report.title}</h3>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <Clock size={12} /> {report.date}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <Archive size={12} /> {report.items} Items
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-all">
                  <Eye size={14} /> View
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-all">
                  <FileDown size={14} /> PDF
                </button>
                <button className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-all">
                  <Share2 size={14} />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default Reports;
