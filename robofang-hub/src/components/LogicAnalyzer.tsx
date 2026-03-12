import React, { useEffect, useRef } from 'react';

const LogicAnalyzer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const channels = 4;
    const points: number[][] = Array.from({ length: channels }, () => []);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1.5;
      
      const channelHeight = canvas.height / channels;

      for (let i = 0; i < channels; i++) {
        // Generate new point
        const lastVal = points[i][points[i].length - 1] || 0;
        let nextVal = lastVal;
        if (Math.random() > 0.95) nextVal = lastVal === 0 ? 1 : 0;
        points[i].push(nextVal);
        if (points[i].length > canvas.width / 2) points[i].shift();

        // Draw channel line
        ctx.strokeStyle = i === 0 ? '#22d3ee' : i === 1 ? '#fbbf24' : i === 2 ? '#a855f7' : '#10b981';
        ctx.beginPath();
        for (let j = 0; j < points[i].length; j++) {
          const x = j * 2;
          const y = (i + 1) * channelHeight - (points[i][j] * (channelHeight * 0.6)) - (channelHeight * 0.2);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw grid baseline
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.moveTo(0, (i + 1) * channelHeight);
        ctx.lineTo(canvas.width, (i + 1) * channelHeight);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="w-full aspect-[4/1] bg-black/40 border border-white/10 rounded-xl overflow-hidden">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={200} 
        className="w-full h-full opacity-60"
      />
    </div>
  );
};

export default LogicAnalyzer;
