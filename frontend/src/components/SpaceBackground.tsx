'use client';

import { useEffect, useRef } from 'react';

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;

      // Deep space base
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // Small dim stars
      const starCount = Math.floor((w * h) / 3500);
      for (let i = 0; i < starCount; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 1.0 + 0.1;
        const a = Math.random() * 0.55 + 0.1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
      }

      // Bright accent stars
      for (let i = 0; i < 18; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * 1.0 + 1.0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.4 + 0.5})`;
        ctx.fill();
      }

      // Nebula — blue, top-center
      const n1 = ctx.createRadialGradient(w * 0.45, h * 0.1, 0, w * 0.45, h * 0.1, w * 0.6);
      n1.addColorStop(0, 'rgba(56,189,248,0.14)');
      n1.addColorStop(0.45, 'rgba(14,165,233,0.06)');
      n1.addColorStop(1, 'transparent');
      ctx.fillStyle = n1;
      ctx.fillRect(0, 0, w, h);

      // Nebula — violet, bottom-right
      const n2 = ctx.createRadialGradient(w * 0.85, h * 0.8, 0, w * 0.85, h * 0.8, w * 0.45);
      n2.addColorStop(0, 'rgba(139,92,246,0.11)');
      n2.addColorStop(1, 'transparent');
      ctx.fillStyle = n2;
      ctx.fillRect(0, 0, w, h);

      // Nebula — cyan, left-mid
      const n3 = ctx.createRadialGradient(w * 0.08, h * 0.55, 0, w * 0.08, h * 0.55, w * 0.28);
      n3.addColorStop(0, 'rgba(34,211,238,0.07)');
      n3.addColorStop(1, 'transparent');
      ctx.fillStyle = n3;
      ctx.fillRect(0, 0, w, h);

      // Nebula — deep blue, center
      const n4 = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.5);
      n4.addColorStop(0, 'rgba(30,58,138,0.07)');
      n4.addColorStop(1, 'transparent');
      ctx.fillStyle = n4;
      ctx.fillRect(0, 0, w, h);
    };

    render();
    window.addEventListener('resize', render);
    return () => window.removeEventListener('resize', render);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
