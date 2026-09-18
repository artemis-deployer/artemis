"use client";

import React from 'react';

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
}

// Fixed candlestick & order depth nodes distributed strictly at outer flanks (left: 0-18%, right: 81-98%)
const candleNodes: CandleData[] = [
  // --- Left Flank (Bid / Inflow depth) ---
  { x: 1.5, y: 12, bodyW: 12, bodyH: 42, wickH: 84, color: '#fae8a4', isHollow: false, duration: 4.8, delay: 0 },
  { x: 3.8, y: 32, bodyW: 16, bodyH: 64, wickH: 110, color: '#cadcf0', isHollow: true, duration: 5.6, delay: -1.4 },
  { x: 6.2, y: 18, bodyW: 10, bodyH: 30, wickH: 65, color: '#ece4d4', isHollow: false, duration: 4.2, delay: -2.8 },
  { x: 8.5, y: 54, bodyW: 14, bodyH: 52, wickH: 95, color: '#fae8a4', isHollow: true, duration: 6.1, delay: -0.7 },
  { x: 11.2, y: 28, bodyW: 18, bodyH: 76, wickH: 130, color: '#fae8a4', isHollow: false, duration: 5.2, delay: -3.5 },
  { x: 13.8, y: 68, bodyW: 12, bodyH: 38, wickH: 70, color: '#cadcf0', isHollow: false, duration: 4.5, delay: -1.9 },
  { x: 16.5, y: 44, bodyW: 15, bodyH: 48, wickH: 88, color: '#ece4d4', isHollow: true, duration: 5.8, delay: -4.1 },

  // --- Right Flank (Ask / Outflow depth) ---
  { x: 82.5, y: 22, bodyW: 14, bodyH: 58, wickH: 105, color: '#cadcf0', isHollow: false, duration: 5.4, delay: -1.1 },
  { x: 85.2, y: 58, bodyW: 18, bodyH: 70, wickH: 125, color: '#fae8a4', isHollow: true, duration: 6.4, delay: -2.5 },
  { x: 88.0, y: 14, bodyW: 11, bodyH: 36, wickH: 72, color: '#ece4d4', isHollow: false, duration: 4.6, delay: -3.8 },
  { x: 90.6, y: 40, bodyW: 16, bodyH: 62, wickH: 115, color: '#cadcf0', isHollow: true, duration: 5.1, delay: -0.4 },
  { x: 93.2, y: 66, bodyW: 13, bodyH: 44, wickH: 80, color: '#fae8a4', isHollow: false, duration: 4.9, delay: -2.1 },
  { x: 95.8, y: 26, bodyW: 15, bodyH: 50, wickH: 92, color: '#ece4d4', isHollow: true, duration: 5.7, delay: -4.6 },
  { x: 97.8, y: 50, bodyW: 10, bodyH: 32, wickH: 60, color: '#fae8a4', isHollow: false, duration: 4.3, delay: -1.7 },
];

export const CandleBars: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 select-none overflow-hidden ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes candleBreathe {
          0%, 100% {
            transform: translateY(0px) scaleY(0.85);
            opacity: 0.35;
          }
          50% {
            transform: translateY(-10px) scaleY(1.18);
            opacity: 0.85;
          }
        }
        @keyframes wickFlicker {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.65; }
        }
      `}</style>

      {candleNodes.map((c, i) => (
        <div
          key={i}
          className="absolute flex flex-col items-center justify-center"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Vertical 1px Wick */}
          <div
            className="w-[1px]"
            style={{
              height: `${c.wickH}px`,
              backgroundColor: c.color,
              animation: `wickFlicker ${c.duration}s ease-in-out infinite`,
              animationDelay: `${c.delay}s`,
            }}
          />

          {/* Candle Body (centered on the wick) */}
          <div
            className="absolute rounded-[1px] transition-all"
            style={{
              width: `${c.bodyW}px`,
              height: `${c.bodyH}px`,
              backgroundColor: c.isHollow ? 'transparent' : c.color,
              border: `1.5px solid ${c.color}`,
              animation: `candleBreathe ${c.duration}s ease-in-out infinite`,
              animationDelay: `${c.delay}s`,
              transformOrigin: 'center center',
            }}
          />

          {/* Micro High/Low Price Tick Notch */}
          <span
            className="absolute -right-3 font-mono text-[9px] tracking-tighter opacity-30"
            style={{
              color: c.color,
              top: `${Math.round(c.bodyH * 0.15)}px`,
            }}
          >
            —
          </span>
        </div>
      ))}
    </div>
  );
};
