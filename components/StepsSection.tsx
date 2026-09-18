"use client";

import React, { useEffect, useRef, useState } from 'react';

const steps = [
  {
    num: '01',
    phase: 'STAGE // 01',
    tag: 'PROMPT INTAKE',
    theme: 'bg-[#ece4d4]',
    title: 'DRAFT WITH AI COPILOT',
    desc: 'Describe your community token or concept. Kentir extracts name, symbol, supply, and liquidity allocation into a clean draft.',
    spec: 'INPUT: NATURAL LANGUAGE DRAFT'
  },
  {
    num: '02',
    phase: 'STAGE // 02',
    tag: 'GENESIS TOKENOMICS',
    theme: 'bg-[#fae8a4]',
    title: 'UNALTERABLE 999M SUPPLY',
    desc: 'Total supply is strictly minted at inception. There is no mint function, no administrative keys, and zero transfer tax.',
    spec: 'SUPPLY: 999,000,000 FIXED'
  },
  {
    num: '03',
    phase: 'STAGE // 03',
    tag: 'AMM LIQUIDITY',
    theme: 'bg-[#cadcf0]',
    title: 'PAIR ONCHAIN LIQUIDITY',
    desc: 'Allocate token supply directly into a DEX liquidity pool. Pair with ETH or SOL to establish sovereign market pricing.',
    spec: 'ROUTERS: HOOD V2 + PUMP.FUN'
  },
  {
    num: '04',
    phase: 'STAGE // 04',
    tag: 'LOCAL RUNTIME',
    theme: 'bg-[#ece4d4]',
    title: 'SIGN FROM YOUR WALLET',
    desc: 'Review gas estimates and sign the deployment transaction in MetaMask, Phantom, or Solflare. Kentir never touches your keys.',
    spec: 'SIGNING: 100% NON-CUSTODIAL'
  }
];

export const StepsSection: React.FC = () => {
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      data-theme="light"
      className="steps-section py-20 sm:py-24 px-[max(6.25vw,24px)] bg-[#f8f6f0] text-[#18191c] overflow-hidden w-full border-t border-[#18191c]/10"
    >
      <div className="max-w-[1400px] mx-auto w-full">
        {/* Centered Section Top */}
        <div className="mb-16 text-center flex flex-col items-center">
          <div className="inline-flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-[#18191c]/55 mb-3 border-b border-[#18191c]/15 pb-1">
            <span>// PROTOCOL_LIFECYCLE</span>
            <span className="text-[#18191c]/25">/</span>
            <span>FOUR DELIBERATE STAGES</span>
          </div>
          <h2 className="font-unbounded text-2xl sm:text-4xl lg:text-[2.6rem] font-bold tracking-tight text-[#18191c] leading-[1.12]">
            Four Steps from Spark to Pool.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#18191c]/70 max-w-lg leading-relaxed font-sans">
            From conversational prompt to verified DEX pair completely under your cryptographic ownership.
          </p>
        </div>

        {/* Stepper Pipeline Cards Grid with Staggered Elevation & Directional Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pb-12 relative">
          {steps.map((step, idx) => {
            const digit0 = parseInt(step.num[0], 10);
            const digit1 = parseInt(step.num[1], 10);

            const stairOffsets = ['lg:translate-y-0', 'lg:translate-y-5', 'lg:translate-y-10', 'lg:translate-y-15'];

            return (
              <article
                key={step.num}
                className={`${step.theme} ${stairOffsets[idx] ?? ''} p-6 sm:p-7 min-h-[340px] rounded-sm border border-[#18191c]/15 flex flex-col justify-between shadow-xs transition-all duration-300 hover:-translate-y-2 hover:shadow-md relative group`}
              >
                {/* Card Top Metadata Header */}
                <div>
                  <div className="flex items-center justify-between border-b border-[#18191c]/15 pb-2.5 mb-4 font-mono text-[10px]">
                    <span className="font-bold tracking-wider text-[#18191c]">{step.phase}</span>
                    <span className="border border-[#18191c]/20 bg-white/40 px-2 py-0.5 rounded-[2px] tracking-tight uppercase text-[#18191c]/75">
                      {step.tag}
                    </span>
                  </div>

                  {/* Mechanical rolling digit slot reel */}
                  <div className="my-4 text-6xl sm:text-7xl font-unbounded font-black tracking-tighter text-[#18191c] flex items-center leading-none">
                    <span className="digit-slot">
                      <span
                        className="digit-reel"
                        style={{
                          transform: inView ? `translateY(-${digit0 * 1.2}em)` : 'translateY(0)',
                          transitionDelay: `${idx * 120}ms`
                        }}
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <i key={n}>{n}</i>
                        ))}
                      </span>
                    </span>
                    <span className="digit-slot">
                      <span
                        className="digit-reel"
                        style={{
                          transform: inView ? `translateY(-${digit1 * 1.2}em)` : 'translateY(0)',
                          transitionDelay: `${idx * 120 + 90}ms`
                        }}
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <i key={n}>{n}</i>
                        ))}
                      </span>
                    </span>
                  </div>

                  <h3 className="font-unbounded text-sm sm:text-base font-bold tracking-tight text-[#18191c] leading-snug mb-2">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-[13px] text-[#18191c]/75 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {/* Bottom Spec Footer */}
                <div className="mt-5 pt-3 border-t border-[#18191c]/15 flex items-center justify-between font-mono text-[10px] text-[#18191c]/60">
                  <span>{step.spec}</span>
                  <span className="text-[#18191c]/35 group-hover:text-[#18191c] transition-colors">↘</span>
                </div>
              </article>
            );
          })}
        </div>

        {/* Principle Strip Marquee */}
        <div className="principle-strip mt-16 pt-8 border-t border-[#18191c]/10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[#18191c]/60 whitespace-nowrap font-bold">
            SOVEREIGN PRINCIPLES:
          </p>

          <div className="principle-marquee flex-1 overflow-hidden select-none">
            <div className="principle-track font-mono text-xs sm:text-sm tracking-widest text-[#18191c]/75">
              <span className="px-6">FIXED SUPPLY · ZERO MINTING · NO OWNER ROLES · SOVEREIGN LIQUIDITY · 100% NON-CUSTODIAL ·</span>
              <span className="px-6" aria-hidden="true">FIXED SUPPLY · ZERO MINTING · NO OWNER ROLES · SOVEREIGN LIQUIDITY · 100% NON-CUSTODIAL ·</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
