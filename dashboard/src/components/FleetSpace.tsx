import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Bot, Cpu, Activity, Globe, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

function StarField() {
    const ref = useRef<THREE.Points>(null);
    const sphere = useMemo(() => {
        const positions = new Float32Array(5000 * 3);
        // Using a deterministic sequence to satisfy purity checks
        for (let i = 0; i < 5000; i++) {
            const stride = i * 3;
            const r = 50;
            const theta = 2 * Math.PI * (i / 5000) * 123.456; // Deterministic spread
            const phi = Math.acos(2 * (i / 5000) - 1);
            positions[stride] = r * Math.sin(phi) * Math.cos(theta);
            positions[stride + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[stride + 2] = r * Math.cos(phi);
        }
        return positions;
    }, []);

    useFrame((_state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 30;
            ref.current.rotation.y -= delta / 45;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
                <PointMaterial transparent color="#8b5cf6" size={0.05} sizeAttenuation={true} depthWrite={false} />
            </Points>
        </group>
    );
}

interface NodeProps {
    id: string;
    name: string;
    domain: string;
    position: [number, number, number];
    color: string;
    onClick: () => void;
}

function FleetNode({ id, name, domain, position, color, onClick }: NodeProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.2;
        }
    });

    // Derive a shorter name if possible
    const shortName = name.split('.')[0].substring(0, 15);

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh
                position={position}
                ref={meshRef}
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[0.3, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={hovered ? 4 : 2}
                    toneMapped={false}
                    transparent
                    opacity={0.8}
                />
                <pointLight intensity={1} distance={5} color={color} />

                <Html distanceFactor={10} position={[0, 0.6, 0]} center>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: hovered ? 1 : 0.6, scale: hovered ? 1.1 : 1 }}
                        className={`px-2 py-0.5 rounded-md border backdrop-blur-md pointer-events-none whitespace-nowrap flex items-center gap-1.5 ${hovered
                                ? 'bg-white/10 border-white/20'
                                : 'bg-black/20 border-white/5'
                            }`}
                        style={{ borderLeftWidth: '3px', borderLeftColor: color }}
                    >
                        <span className="text-[10px] font-bold text-white font-mono tracking-tight uppercase">
                            {shortName}
                        </span>
                    </motion.div>
                </Html>
            </mesh>
        </Float>
    );
}

interface HubLinkProps {
    to: string;
    label: string;
    icon: string;
    color: string;
}

function HubLink({ to, label, icon, color }: HubLinkProps) {
    return (
        <Link
            to={to}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br ${color} border border-white/5 hover:border-white/10 transition-all group`}
        >
            <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{label}</span>
        </Link>
    );
}

interface FleetSpaceProps {
    nodes: Array<{ id: string; name: string; domain: string; type?: string; capabilities?: string[] }>;
}

const DOMAIN_COLORS: Record<string, string> = {
    connectors: '#6366f1',
    creative: '#a855f7',
    knowledge: '#3b82f6',
    comms: '#06b6d4',
    system: '#64748b',
    hardware_iot: '#10b981',
    robotics_vr: '#ec4899',
};

const FleetSpace: React.FC<FleetSpaceProps> = ({ nodes }) => {
    const [selectedNode, setSelectedNode] = useState<any>(null);

    // Stable node layout generation
    const nodeLayout = useMemo(() => {
        return nodes.map((node, i) => {
            const radius = 8 + (i % 5);
            const phi = Math.acos(-1 + (2 * i) / nodes.length);
            const theta = Math.sqrt(nodes.length * Math.PI) * phi;

            return {
                ...node,
                position: [
                    radius * Math.cos(theta) * Math.sin(phi),
                    radius * Math.sin(theta) * Math.sin(phi),
                    radius * Math.cos(phi)
                ] as [number, number, number],
                color: DOMAIN_COLORS[node.domain] || '#94a3b8'
            };
        });
    }, [nodes]);

    return (
        <div className="w-full h-[550px] bg-[#050512] rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

            <div className="absolute top-8 left-8 z-10 space-y-1">
                <div className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.4em] animate-pulse">
                    Topology Visualization
                </div>
                <div className="text-2xl font-heading font-bold text-white tracking-tight">
                    Swarm <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Deep Space</span>
                </div>
            </div>

            <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
                <color attach="background" args={['#050512']} />
                <PerspectiveCamera makeDefault position={[0, 0, 25]} fov={40} />
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={2} />
                <gridHelper args={[100, 50, 0x444444, 0x111111]} position={[0, -12, 0]} />

                <StarField />

                <group>
                    {nodeLayout.map((node) => (
                        <FleetNode
                            key={node.id}
                            id={node.id}
                            name={node.name}
                            domain={node.domain}
                            position={node.position}
                            color={node.color}
                            onClick={() => setSelectedNode(node)}
                        />
                    ))}
                </group> group
            </Canvas>

            {/* Modal Overlay */}
            <AnimatePresence>
                {selectedNode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-md"
                        onClick={() => setSelectedNode(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#0f0f1c] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative h-32 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-600/20 px-8 flex items-center">
                                <div className="absolute top-4 right-4">
                                    <button
                                        onClick={() => setSelectedNode(null)}
                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-white/80">
                                        {selectedNode.type?.includes('agent') ? <Bot size={32} /> : <Cpu size={32} />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white tracking-tight">{selectedNode.name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_theme(colors.emerald.500)]" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedNode.domain}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                        <Info size={12} />
                                        Substrate Description
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                        The <strong>{selectedNode.name}</strong> connector operates within the <strong>{selectedNode.domain}</strong> sector, providing specialized capabilities for the RoboFang swarm. It facilitates high-fidelity orchestration and autonomous mission control at the edge.
                                    </p>
                                </div>

                                {selectedNode.capabilities && selectedNode.capabilities.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                            <Activity size={12} />
                                            Exposed Capabilities
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedNode.capabilities.map((cap: string) => (
                                                <span key={cap} className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs text-indigo-300 font-mono">
                                                    {cap}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Status</span>
                                        <span className="text-emerald-400 text-xs font-mono font-bold">NOMINAL_ONLINE</span>
                                    </div>
                                    <Link
                                        to={`/${selectedNode.domain === 'knowledge' ? 'knowledge-hub' : selectedNode.domain}`}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                                    >
                                        Access Sector
                                        <ExternalLink size={14} />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute bottom-8 right-8 z-10 flex items-center gap-6">
                <div className="flex gap-2">
                    {Object.entries(DOMAIN_COLORS).map(([domain, color]) => (
                        <div
                            key={domain}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: color as string }}
                            title={domain}
                        />
                    ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Topology Sync: Active</span>
                </div>
            </div>

            <div className="absolute bottom-8 left-8 z-10 grid grid-cols-2 md:grid-cols-6 gap-2 opacity-80 hover:opacity-100 transition-opacity">
                <HubLink to="/home" label="Home" icon="🏠" color="from-blue-500/20 to-indigo-500/20" />
                <HubLink to="/creative" label="Creative" icon="🎨" color="from-purple-500/20 to-pink-500/20" />
                <HubLink to="/knowledge-hub" label="Knowledge" icon="🧠" color="from-amber-500/20 to-yellow-500/20" />
                <HubLink to="/infra" label="Infra" icon="🔌" color="from-emerald-500/20 to-teal-500/20" />
                <HubLink to="/robotics" label="Robotics" icon="🤖" color="from-red-500/20 to-orange-500/20" />
                <HubLink to="/virtual" label="Virtual" icon="🥽" color="from-pink-500/20 to-violet-500/20" />
            </div>
        </div>
    );
};

export default FleetSpace;
