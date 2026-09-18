"use client";

import React, { useEffect, useRef, useState } from 'react';

const steps = [
  {
    theme: 'bg-[#f1d2e8]',
    num: '01',
    title: 'DRAFT WITH AI COPILOT',
    desc: 'Describe your community token or concept. Kentir extracts name, symbol, supply, and liquidity allocation into a clean draft.'
  },
  {
    theme: 'bg-[#e4cef7]',
    num: '02',
    title: 'UNALTERABLE 999M SUPPLY',
    desc: 'Total supply is strictly minted at inception. There is no mint function, no administrative keys, and zero transfer tax.'
  },
  {
    theme: 'bg-[#b9e2f8]',
    num: '03',
    title: 'PAIR ONCHAIN LIQUIDITY',
    desc: 'Allocate token supply directly into a DEX liquidity pool. Pair with ETH or SOL to establish sovereign market pricing.'
  },
  {
    theme: 'bg-[#f1d2e8]',
    num: '04',
    title: 'SIGN FROM YOUR WALLET',
    desc: 'Review gas estimates and sign the deployment transaction in MetaMask, Phantom, or Solflare. Kentir never touches your keys.'
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
      className="steps-section py-28 px-6 md:px-12 bg-[#f8f7fa] text-[#17131f] overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Top */}
        <div className="mb-16">
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#17131f] mb-4">
            Four Steps from Spark to Pool
          </h2>
          <p className="text-base sm:text-lg text-[#17131f]/70 max-w-md leading-relaxed">
            Four deliberate stages.<br />From idea to verified DEX pool completely under your ownership.
          </p>
        </div>

        {/* Stair Cards Grid with Staggered Offset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
          {steps.map((step, idx) => {
            const digit0 = parseInt(step.num[0], 10);
            const digit1 = parseInt(step.num[1], 10);

            return (
              <article
                key={step.num}
                className={`${step.theme} p-8 min-h-[350px] rounded flex flex-col justify-between shadow-sm transition-transform duration-500 hover:-translate-y-2`}
                style={{
                  transform: typeof window !== 'undefined' && window.innerWidth > 1024 ? `translateY(${idx * 32}px)` : 'none'
                }}
              >
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#17131f]">
                  {step.title}
                </h3>

                {/* Mechanical rolling digit slot reel */}
                <div className="my-6 text-7xl font-sans font-light tracking-tighter text-[#17131f] flex items-center">
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

                <p className="text-sm text-[#17131f]/80 leading-relaxed">
                  {step.desc}
                </p>
              </article>
            );
          })}
        </div>

        {/* Principle Strip Marquee */}
        <div className="principle-strip mt-20 pt-10 border-t border-[#17131f]/10 flex flex-col md:flex-row items-start md:items-center gap-8">
          <p className="font-semibold text-sm tracking-wide text-[#17131f] whitespace-nowrap">
            Built around sovereign<br />execution.
          </p>

          <div className="principle-marquee flex-1 overflow-hidden select-none">
            <div className="principle-track font-mono text-sm md:text-base tracking-widest text-[#17131f]/80">
              <span className="px-6">FIXED SUPPLY · ZERO MINTING · NO OWNER ROLES · SOVEREIGN LIQUIDITY · 100% NON-CUSTODIAL ·</span>
              <span className="px-6" aria-hidden="true">FIXED SUPPLY · ZERO MINTING · NO OWNER ROLES · SOVEREIGN LIQUIDITY · 100% NON-CUSTODIAL ·</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
