import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Info } from 'lucide-react';

const KitchenSink: React.FC = () => {
    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 h-full flex flex-col items-center justify-center">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
            >
                <h1 className="text-4xl font-bold text-white tracking-tight flex items-center justify-center gap-3">
                    <Sparkles className="text-amber-400" />
                    The Infrastructure Hub
                </h1>
                <p className="text-slate-400 max-w-xl mx-auto text-lg italic">
                    "Wait, did we forget something?" — "Don't worry, even the kitchen sink is in here now."
                </p>
            </motion.header>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                className="relative group lg:max-w-3xl"
            >
                {/* Decorative Glow */}
                <div className="absolute -inset-4 bg-amber-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                <div className="relative glass-panel overflow-hidden border- amber-500/20">
                    <img
                        src="/assets/kitchen_sink_premium_illustration_1771779765087.png"
                        alt="A futuristic kitchen sink representing the exhaustive nature of RoboFang"
                        className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                    />

                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-slate-950 to-transparent">
                        <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
                            <Info size={16} />
                            <span>System Component: Sovereign Sanitation & Disposal Unit (v1.0)</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-slate-500 text-sm italic"
            >
                Zero-friction drainage. High-availability porcelain. Industrial-grade humor.
            </motion.div>
        </div>
    );
};

export default KitchenSink;
