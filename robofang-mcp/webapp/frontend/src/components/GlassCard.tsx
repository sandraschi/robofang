import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className, 
  title, 
  subtitle,
  icon 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn("glass-panel p-6 flex flex-col gap-4", className)}
    >
      {(title || icon) && (
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-2">
          {icon && <div className="text-violet-400 opacity-80">{icon}</div>}
          <div className="flex flex-col">
            {title && <h3 className="text-lg font-semibold tracking-tight leading-none">{title}</h3>}
            {subtitle && <span className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wider">{subtitle}</span>}
          </div>
        </div>
      )}
      <div className="flex-1">
        {children}
      </div>
    </motion.div>
  );
};
