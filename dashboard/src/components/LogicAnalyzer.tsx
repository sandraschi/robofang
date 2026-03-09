import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Pulse {
    id: number;
    active: boolean;
    timestamp: number;
}

export default function LogicAnalyzer() {
    const [pulses, setPulses] = useState<Pulse[]>([]);
    const [clock, setClock] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setClock(prev => (prev + 1) % 100);

            if (Math.random() > 0.7) {
                setPulses(prev => [
                    { id: Date.now(), active: Math.random() > 0.3, timestamp: Date.now() },
                    ...prev.slice(0, 15)
                ]);
            }
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="verilog-border p-4 rounded-lg overflow-hidden relative">
            <div className="scanline" />
            <div className="flex justify-between items-center mb-4">
                <span className="glow-terminal text-xs font-bold leading-none">AGENT_LOGIC_ANALYZER_V1.0</span>
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] text-success/60 font-mono">CLK: {clock.toString(16).toUpperCase()}</span>
                </div>
            </div>

            <div className="space-y-3">
                {['SIG_HAND_A', 'SIG_HAND_B', 'SIG_FLEET_SYNC'].map((sig) => (
                    <div key={sig} className="relative">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-success/40 font-mono">{sig}</span>
                        </div>
                        <div className="h-8 bg-black/40 border border-success/10 rounded relative flex items-end">
                            <div className="absolute inset-0 verilog-grid opacity-20" />
                            <div className="flex items-end h-full w-full gap-[1px] px-1">
                                {pulses.map((p) => (
                                    <motion.div
                                        key={p.id}
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{
                                            height: p.active ? '70%' : '10%',
                                            opacity: 1
                                        }}
                                        className={`flex-1 ${p.active ? 'bg-success' : 'bg-success/20'} rounded-t-sm`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 bus-line" />
            <div className="mt-2 flex justify-between text-[9px] text-success/30 font-mono">
                <span>0x0000</span>
                <span>0x4000</span>
                <span>0x8000</span>
                <span>0xC000</span>
                <span>0xFFFF</span>
            </div>
        </div>
    );
}
