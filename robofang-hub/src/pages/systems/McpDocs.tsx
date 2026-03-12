import { useEffect, useState } from 'react';
import { 
  Server, Box, Settings, Code, ChevronRight, 
  Search, Shield, Zap, Database, Terminal
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Input } from '../../components/ui/input';
import axios from 'axios';

interface McpServer {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  version: string;
  tools_count: number;
  type: string;
}

const McpDocs: React.FC = () => {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedServer, setSelectedServer] = useState<string | null>(null);

  useEffect(() => {
    const fetchFleet = async () => {
      try {
        const response = await axios.get('http://localhost:10871/fleet');
        if (response.data.success) {
          setServers(response.data.connectors || []);
        }
      } catch (err) {
        console.error('Failed to fetch fleet for MCP Docs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFleet();
  }, []);

  const filteredServers = servers.filter(s => 
    s.id.toLowerCase().includes(search.toLowerCase()) || 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] animate-pulse">Decrypting Registry Substrate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Server size={20} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">MCP Registry</h1>
          </div>
          <p className="text-zinc-500 text-sm font-medium">Model Context Protocol server hierarchy and tool schemas.</p>
        </div>
        <div className="w-full md:w-80 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input 
            placeholder="Search Protocol Nodes..." 
            className="pl-10 h-11 bg-white/5 border-white/10 text-white font-bold text-xs uppercase"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Server List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Connected Nodes</h3>
            <Badge variant="outline" className="text-[9px] font-black border-white/5 text-zinc-500 underline underline-offset-2">
              {filteredServers.length} Active
            </Badge>
          </div>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {filteredServers.map((server) => (
              <GlassCard 
                key={server.id}
                onClick={() => setSelectedServer(server.id)}
                className={`p-4 cursor-pointer transition-all border-l-4 ${
                  selectedServer === server.id 
                    ? 'bg-white/[0.08] border-purple-500' 
                    : 'hover:bg-white/[0.04] border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${server.status === 'ONLINE' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      <Box size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">{server.name}</h4>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{server.type} • v{server.version}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className={selectedServer === server.id ? 'text-purple-400' : 'text-zinc-700'} />
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Detailed View */}
        <div className="lg:col-span-8">
          {selectedServer ? (
            <GlassCard className="p-8 space-y-8 min-h-[70vh]">
              <header className="flex items-start justify-between">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
                    {servers.find(s => s.id === selectedServer)?.name}
                  </h2>
                  <div className="flex gap-2">
                    <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-0 text-[9px] font-black uppercase">
                      ID: {selectedServer}
                    </Badge>
                    <Badge variant="outline" className="border-white/10 text-zinc-500 text-[9px] font-black uppercase">
                      Architecture: x64
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" className="h-9 w-9 p-0 text-zinc-500 hover:text-white">
                    <Settings size={18} />
                  </Button>
                  <Button variant="ghost" className="h-9 w-9 p-0 text-zinc-500 hover:text-white">
                    <Shield size={18} />
                  </Button>
                </div>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Code size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Tools</span>
                  </div>
                  <p className="text-2xl font-black text-white leading-none">
                    {servers.find(s => s.id === selectedServer)?.tools_count || 0}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Zap size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Uptime</span>
                  </div>
                  <p className="text-2xl font-black text-white leading-none">99.8%</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-cyan-500">
                    <Database size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Protocol</span>
                  </div>
                  <p className="text-2xl font-black text-white leading-none uppercase italic">SSE/JSON</p>
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-purple-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Exposed Tool Manifest</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Mocking tools for now as we don't have tool detail fetch yet */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 space-y-3 group hover:bg-white/[0.05] transition-colors">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-purple-400 transition-colors">
                          tool_{i}_operation_executor
                        </h4>
                        <Badge variant="outline" className="text-[8px] font-black border-white/10 text-zinc-500">READONLY</Badge>
                      </div>
                      <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                        Performs atomic operation on the {selectedServer} substrate with full verification.
                      </p>
                      <div className="pt-2 flex flex-wrap gap-2">
                        <Badge className="bg-blue-500/10 text-blue-400 border-0 text-[8px] font-bold">query: string</Badge>
                        <Badge className="bg-purple-500/10 text-purple-400 border-0 text-[8px] font-bold">limit: number</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          ) : (
            <div className="h-full flex items-center justify-center min-h-[70vh]">
              <GlassCard className="p-12 text-center space-y-4 max-w-sm">
                <Server className="mx-auto text-zinc-800" size={64} />
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Select a Node</h3>
                  <p className="text-xs text-zinc-500 font-medium">Choose an MCP server from the registry to inspect its tools and schemas.</p>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default McpDocs;
