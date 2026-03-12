import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  delay?: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, title, className = '', delay = 0, onClick, onMouseEnter }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`glass-panel p-6 ${className}`}
    >
      {title && (
        <h3 className="text-xl font-bold mb-4 font-gradient leading-tight">
          {title}
        </h3>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

export default GlassCard;
