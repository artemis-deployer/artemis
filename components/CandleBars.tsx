"use client";

import React, { useEffect, useRef } from 'react';

type MotionType = 'bull' | 'bear' | 'drift';

interface CandleData {
  x: number; // percentage from left
  y: number; // percentage from top
  bodyW: number;
  bodyH: number;
  wickH: number;
  color: string;
  isHollow: boolean;
  duration: number; // seconds
  delay: number; // seconds
  motion: MotionType;
}

// Candlestick & order depth nodes strictly at outer flanks (left: 0-18%, right: 81-98%)
const candleNodes: CandleData[] = [
  // --- Left Flank (Bid / Inflow depth) ---
  { x: 1.5, y: 15, bodyW: 12, bodyH: 46, wickH: 95, color: '#fae8a4', isHollow: false, duration: 2.8, delay: 0, motion: 'bull' },
  { x: 3.8, y: 34, bodyW: 16, bodyH: 68, wickH: 120, color: '#cadcf0', isHollow: true, duration: 3.4, delay: -0.9, motion: 'drift' },
  { x: 6.2, y: 18, bodyW: 10, bodyH: 34, wickH: 70, color: '#ece4d4', isHollow: false, duration: 2.5, delay: -1.7, motion: 'bear' },
  { x: 8.5, y: 56, bodyW: 14, bodyH: 58, wickH: 105, color: '#fae8a4', isHollow: true, duration: 3.6, delay: -0.4, motion: 'bull' },
  { x: 11.2, y: 28, bodyW: 18, bodyH: 80, wickH: 140, color: '#fae8a4', isHollow: false, duration: 3.1, delay: -2.1, motion: 'drift' },
  { x: 13.8, y: 70, bodyW: 12, bodyH: 42, wickH: 80, color: '#cadcf0', isHollow: false, duration: 2.7, delay: -1.2, motion: 'bull' },
  { x: 16.5, y: 44, bodyW: 15, bodyH: 52, wickH: 96, color: '#ece4d4', isHollow: true, duration: 3.5, delay: -2.6, motion: 'bear' },

  // --- Right Flank (Ask / Outflow depth) ---
  { x: 82.5, y: 22, bodyW: 14, bodyH: 62, wickH: 115, color: '#cadcf0', isHollow: false, duration: 3.2, delay: -0.7, motion: 'drift' },
  { x: 85.2, y: 60, bodyW: 18, bodyH: 74, wickH: 135, color: '#fae8a4', isHollow: true, duration: 3.7, delay: -1.5, motion: 'bear' },
  { x: 88.0, y: 14, bodyW: 11, bodyH: 38, wickH: 78, color: '#ece4d4', isHollow: false, duration: 2.6, delay: -2.3, motion: 'bull' },
  { x: 90.6, y: 42, bodyW: 16, bodyH: 66, wickH: 125, color: '#cadcf0', isHollow: true, duration: 3.0, delay: -0.2, motion: 'bull' },
  { x: 93.2, y: 68, bodyW: 13, bodyH: 48, wickH: 88, color: '#fae8a4', isHollow: false, duration: 2.9, delay: -1.3, motion: 'drift' },
  { x: 95.8, y: 26, bodyW: 15, bodyH: 54, wickH: 98, color: '#ece4d4', isHollow: true, duration: 3.4, delay: -2.8, motion: 'bear' },
  { x: 97.8, y: 52, bodyW: 10, bodyH: 36, wickH: 68, color: '#fae8a4', isHollow: false, duration: 2.5, delay: -1.0, motion: 'bull' },
];

export const CandleBars: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const candleRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let mouseX = -9999;
    let mouseY = -9999;
    let targetMouseX = -9999;
    let targetMouseY = -9999;
    let rafId = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetMouseX = e.clientX - rect.left;
      targetMouseY = e.clientY - rect.top;
    };

    const handlePointerLeave = () => {
      targetMouseX = -9999;
      targetMouseY = -9999;
    };

    const parent = container.parentElement ?? window;
    parent.addEventListener('mousemove', handlePointerMove as EventListener, { passive: true });
    parent.addEventListener('mouseleave', handlePointerLeave as EventListener);

    const tick = () => {
      mouseX += (targetMouseX - mouseX) * 0.12;
      mouseY += (targetMouseY - mouseY) * 0.12;

      const rect = container.getBoundingClientRect();
      const w = rect.width || 1;
      const h = rect.height || 1;

      candleNodes.forEach((c, idx) => {
        const el = candleRefs.current[idx];
        if (!el) return;

        const nodePxX = (c.x / 100) * w;
        const nodePxY = (c.y / 100) * h;
        const dx = nodePxX - mouseX;
        const dy = nodePxY - mouseY;
        const dist = Math.hypot(dx, dy);
        const radius = 190;

        if (dist < radius && mouseX > -5000) {
          const force = 1 - dist / radius;
          const pushX = (dx / (dist || 1)) * force * 24;
          const pushY = (dy / (dist || 1)) * force * 28;
          const scale = 1 + force * 0.22;
          el.style.transform = `translate(calc(-50% + ${pushX.toFixed(1)}px), calc(-50% + ${pushY.toFixed(1)}px)) scale(${scale.toFixed(2)})`;
        } else {
          el.style.transform = 'translate(-50%, -50%) scale(1)';
        }
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      parent.removeEventListener('mousemove', handlePointerMove as EventListener);
      parent.removeEventListener('mouseleave', handlePointerLeave as EventListener);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 z-0 select-none overflow-hidden ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
      }}
      aria-hidden="true"
    >
      <style>{`
        /* Bullish impulse: surge up with expansion */
        @keyframes candleBull {
          0%, 100% {
            transform: translateY(14px) scaleY(0.55);
            opacity: 0.3;
          }
          40% {
            transform: translateY(-28px) scaleY(1.45);
            opacity: 0.95;
          }
          70% {
            transform: translateY(-8px) scaleY(0.9);
            opacity: 0.6;
          }
        }

        /* Bearish impulse: dip down with contraction */
        @keyframes candleBear {
          0%, 100% {
            transform: translateY(-22px) scaleY(1.35);
            opacity: 0.85;
          }
          45% {
            transform: translateY(24px) scaleY(0.45);
            opacity: 0.25;
          }
          80% {
            transform: translateY(-4px) scaleY(1.05);
            opacity: 0.7;
          }
        }

        /* Floating parallax drift: smooth continuous oscillation */
        @keyframes candleDrift {
          0%, 100% {
            transform: translateY(-20px) scaleY(0.75);
            opacity: 0.35;
          }
          50% {
            transform: translateY(22px) scaleY(1.3);
            opacity: 0.9;
          }
        }

        /* Dynamic wick stretch */
        @keyframes wickStretch {
          0%, 100% {
            transform: scaleY(0.65);
            opacity: 0.25;
          }
          50% {
            transform: scaleY(1.4);
            opacity: 0.75;
          }
        }

        /* Micro tick pulse */
        @keyframes tickPulse {
          0%, 100% { opacity: 0.2; transform: translateX(0); }
          50% { opacity: 0.85; transform: translateX(2px); }
        }
      `}</style>

      {candleNodes.map((c, i) => {
        const animName =
          c.motion === 'bull'
            ? 'candleBull'
            : c.motion === 'bear'
            ? 'candleBear'
            : 'candleDrift';

        return (
          <div
            key={i}
            ref={(el) => {
              candleRefs.current[i] = el;
            }}
            className="absolute flex flex-col items-center justify-center transition-transform duration-75 ease-out"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              transform: 'translate(-50%, -50%) scale(1)',
              willChange: 'transform',
            }}
          >
            {/* Vertical 1px Wick with dynamic stretch */}
            <div
              className="w-[1px]"
              style={{
                height: `${c.wickH}px`,
                backgroundColor: c.color,
                animation: `wickStretch ${c.duration}s ease-in-out infinite`,
                animationDelay: `${c.delay}s`,
                transformOrigin: 'center center',
              }}
            />

            {/* Candle Body with high-contrast motion & volatility */}
            <div
              className="absolute rounded-[1px] transition-all"
              style={{
                width: `${c.bodyW}px`,
                height: `${c.bodyH}px`,
                backgroundColor: c.isHollow ? 'transparent' : c.color,
                border: `1.5px solid ${c.color}`,
                animation: `${animName} ${c.duration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                animationDelay: `${c.delay}s`,
                transformOrigin: 'center center',
              }}
            />

            {/* Micro High/Low Price Tick Notch */}
            <span
              className="absolute -right-3 font-mono text-[9px] tracking-tighter"
              style={{
                color: c.color,
                top: `${Math.round(c.bodyH * 0.2)}px`,
                animation: `tickPulse ${c.duration * 0.8}s ease-in-out infinite`,
                animationDelay: `${c.delay}s`,
              }}
            >
              —
            </span>
          </div>
        );
      })}
    </div>
  );
};
