"use client";

import React, { useRef } from 'react';
import { BlockyGridCanvas } from './BlockyGridCanvas';

interface IntroSectionProps {
  onOpenSoon: (feature: string) => void;
}

export const IntroSection: React.FC<IntroSectionProps> = () => {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="intro relative min-h-[820px] w-full flex flex-col justify-center items-center text-center px-[max(6.25vw,24px)] py-28 bg-[#ece4d4] text-[#18191c] overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      {/* 3D Three.js Interactive Blocky Grid */}
      <BlockyGridCanvas sectionRef={sectionRef} />

      {/* Radial soft ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(250,232,164,0.3)_0%,transparent_70%)] pointer-events-none -z-10" />

      <div className="relative z-10 max-w-[1800px] mx-auto w-full flex flex-col items-center">
        <p className="text-xs md:text-sm font-semibold tracking-[0.22em] uppercase text-[#18191c]/70 mb-10 font-mono">
          SOVEREIGNTY IN EVERY LAUNCH
        </p>

        {/* Dynamic Display Text with scrubbed scroll opacity */}
        <h2 className="font-sans text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.12] text-[#18191c] text-center max-w-3xl">
          Kentir puts token creation<br />
          back in your own hands.<br />
          No hidden mint traps.<br />
          No platform custody.<br />
          You sign every block.
        </h2>

        <div className="mt-14">
          <a
            href="#studio"
            className="dp-button dark-button min-w-[220px]"
          >
            <span>MEET KENTIR STUDIO</span>
            <span className="arrow-box">↘</span>
          </a>
        </div>
      </div>
    </section>
  );
};
