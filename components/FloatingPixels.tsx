"use client";

import React, { useEffect, useRef } from 'react';

type MotionType = 'bull' | 'bear' | 'drift';

interface CandleData {
  x: number;
  y: number;
  bodyW: number;
  bodyH: number;
  wickH: number;
  color: string;
  isHollow: boolean;
  duration: number;
  delay: number;
  motion: MotionType;
}

const candleNodes: CandleData[] = [
  // --- Left Flank (Bid / Inflow depth) ---
  { x: 1.5, y: 35, bodyW: 10, bodyH: 32, wickH: 55, color: '#fae8a4', isHollow: false, duration: 2.8, delay: 0, motion: 'bull' },
  { x: 4.2, y: 50, bodyW: 12, bodyH: 42, wickH: 70, color: '#cadcf0', isHollow: true, duration: 3.4, delay: -0.9, motion: 'drift' },
  { x: 7.0, y: 28, bodyW: 8, bodyH: 26, wickH: 45, color: '#ece4d4', isHollow: false, duration: 2.5, delay: -1.7, motion: 'bear' },
  { x: 10.5, y: 62, bodyW: 12, bodyH: 38, wickH: 65, color: '#fae8a4', isHollow: true, duration: 3.6, delay: -0.4, motion: 'bull' },
  { x: 13.8, y: 40, bodyW: 14, bodyH: 48, wickH: 75, color: '#fae8a4', isHollow: false, duration: 3.1, delay: -2.1, motion: 'drift' },
  { x: 16.5, y: 68, bodyW: 10, bodyH: 30, wickH: 50, color: '#cadcf0', isHollow: false, duration: 2.7, delay: -1.2, motion: 'bull' },
  { x: 19.0, y: 45, bodyW: 11, bodyH: 36, wickH: 60, color: '#ece4d4', isHollow: true, duration: 3.5, delay: -2.6, motion: 'bear' },

  // --- Right Flank (Ask / Outflow depth) ---
  { x: 80.5, y: 42, bodyW: 11, bodyH: 38, wickH: 65, color: '#cadcf0', isHollow: false, duration: 3.2, delay: -0.7, motion: 'drift' },
  { x: 83.2, y: 65, bodyW: 14, bodyH: 46, wickH: 75, color: '#fae8a4', isHollow: true, duration: 3.7, delay: -1.5, motion: 'bear' },
  { x: 86.0, y: 30, bodyW: 9, bodyH: 28, wickH: 48, color: '#ece4d4', isHollow: false, duration: 2.6, delay: -2.3, motion: 'bull' },
  { x: 89.2, y: 55, bodyW: 12, bodyH: 42, wickH: 70, color: '#cadcf0', isHollow: true, duration: 3.0, delay: -0.2, motion: 'bull' },
  { x: 92.5, y: 70, bodyW: 10, bodyH: 32, wickH: 55, color: '#fae8a4', isHollow: false, duration: 2.9, delay: -1.3, motion: 'drift' },
  { x: 95.2, y: 38, bodyW: 12, bodyH: 36, wickH: 60, color: '#ece4d4', isHollow: true, duration: 3.4, delay: -2.8, motion: 'bear' },
  { x: 97.8, y: 58, bodyW: 8, bodyH: 26, wickH: 45, color: '#fae8a4', isHollow: false, duration: 2.5, delay: -1.0, motion: 'bull' },
];

export const FloatingPixels: React.FC<{ className?: string }> = ({ className = '' }) => {
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
        const radius = 160;

        if (dist < radius && mouseX > -5000) {
          const force = 1 - dist / radius;
          const pushX = (dx / (dist || 1)) * force * 18;
          const pushY = (dy / (dist || 1)) * force * 20;
          const scale = 1 + force * 0.18;
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
      className={`pixels pointer-events-none select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <style>{`
        @keyframes footerCandleBull {
          0%, 100% {
            transform: translateY(8px) scaleY(0.6);
            opacity: 0.35;
          }
          40% {
            transform: translateY(-16px) scaleY(1.35);
            opacity: 0.95;
          }
          70% {
            transform: translateY(-4px) scaleY(0.9);
            opacity: 0.6;
          }
        }

        @keyframes footerCandleBear {
          0%, 100% {
            transform: translateY(-12px) scaleY(1.25);
            opacity: 0.85;
          }
          45% {
            transform: translateY(14px) scaleY(0.5);
            opacity: 0.3;
          }
          80% {
            transform: translateY(-2px) scaleY(1.05);
            opacity: 0.7;
          }
        }

        @keyframes footerCandleDrift {
          0%, 100% {
            transform: translateY(-10px) scaleY(0.8);
            opacity: 0.4;
          }
          50% {
            transform: translateY(12px) scaleY(1.25);
            opacity: 0.9;
          }
        }

        @keyframes footerWickStretch {
          0%, 100% {
            transform: scaleY(0.7);
            opacity: 0.3;
          }
          50% {
            transform: scaleY(1.35);
            opacity: 0.8;
          }
        }

        @keyframes footerTickPulse {
          0%, 100% { opacity: 0.25; transform: translateX(0); }
          50% { opacity: 0.9; transform: translateX(2px); }
        }
      `}</style>

      {candleNodes.map((c, i) => {
        const animName =
          c.motion === 'bull'
            ? 'footerCandleBull'
            : c.motion === 'bear'
            ? 'footerCandleBear'
            : 'footerCandleDrift';

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
            {/* 1px Wick */}
            <div
              className="w-[1px]"
              style={{
                height: `${c.wickH}px`,
                backgroundColor: c.color,
                animation: `footerWickStretch ${c.duration}s ease-in-out infinite`,
                animationDelay: `${c.delay}s`,
                transformOrigin: 'center center',
              }}
            />

            {/* Candle Body */}
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

            {/* Price Tick Notch */}
            <span
              className="absolute -right-2.5 font-mono text-[8px] tracking-tighter select-none"
              style={{
                color: c.color,
                top: `${Math.round(c.bodyH * 0.25)}px`,
                animation: `footerTickPulse ${c.duration * 0.8}s ease-in-out infinite`,
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
