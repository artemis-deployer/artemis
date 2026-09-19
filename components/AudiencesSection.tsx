"use client";

import React, { useState } from 'react';
import { 
  Users, 
  Terminal, 
  Cpu, 
  ArrowUpRight, 
  ShieldCheck, 
  Check, 
  Layers,
  Sparkles
} from 'lucide-react';
import { usePageTransition } from './PageTransition';

interface BuilderSegment {
  id: string;
  tabLabel: string;
  tag: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  img: string;
  badge: string;
  accentColor: string;
  borderColor: string;
  metrics: Array<{ label: string; value: string }>;
  cliCommand: string;
  href: string;
}

const BUILDER_SEGMENTS: BuilderSegment[] = [
  {
    id: 'creators',
    tabLabel: 'Community Creators',
    tag: 'VIRAL MOVEMENTS',
    title: 'Turn Cultural Movements into Sovereign Onchain Liquidity',
    desc: 'Launch community tokens and meme movements with permanently locked liquidity, fair genesis minting, and zero developer backdoors. Your community retains true economic sovereignty from block zero.',
    icon: Users,
    img: '/assets/walkways.png',
    badge: 'FAIR LAUNCH VERIFIED',
    accentColor: 'text-[#cadcf0]',
    borderColor: 'border-[#cadcf0]/40',
    metrics: [
      { label: 'GENESIS MODEL', value: 'Fair Launch' },
      { label: 'DEV TAX', value: 'Zero (0.00%)' },
      { label: 'LP DESTINATION', value: 'Burnt 0xdead' },
      { label: 'MINT FUNCTION', value: 'Non-Existent' }
    ],
    cliCommand: 'artemis.deploy({ archetype: "community", lpLock: true, devTax: 0 })',
    href: '#how-it-works'
  },
  {
    id: 'developers',
    tabLabel: 'Web3 Developers',
    tag: 'DEFI ARCHITECTS',
    title: 'Deploy Verified Contracts Directly to Automated DEX Pools',
    desc: 'Synthesize non-custodial smart contracts compiled deterministically on Robinhood Chain or Solana Mainnet. Ownership is renounced at construction, guaranteeing permanent anti-rug compliance.',
    icon: Terminal,
    img: '/assets/terrain.png',
    badge: 'BYTECODE AUDITED',
    accentColor: 'text-[#fae8a4]',
    borderColor: 'border-[#fae8a4]/40',
    metrics: [
      { label: 'COMPILER', value: 'solc 0.8.26' },
      { label: 'OWNERSHIP', value: 'address(0x0)' },
      { label: 'ROUTER', value: 'Uniswap V2' },
      { label: 'PLATFORM TOLL', value: '0.00% Immutable' }
    ],
    cliCommand: 'solc.compile({ contract: "ERC20Sovereign", renounceOnDeploy: true })',
    href: '#how-it-works'
  },
  {
    id: 'agents',
    tabLabel: 'Autonomous AI Agents',
    tag: 'PROGRAMMATIC DAEMONS',
    title: 'Deterministic Liquidity Rails for Autonomous Agents',
    desc: 'Empower autonomous AI agents, compute DAOs, and algorithmic agents to strike programmatic assets, automate liquidity routing, and seed token economics with zero human custodial intervention.',
    icon: Cpu,
    img: '/assets/pyramids.png',
    badge: 'NON-CUSTODIAL RPC',
    accentColor: 'text-[#ece4d4]',
    borderColor: 'border-[#ece4d4]/40',
    metrics: [
      { label: 'RUNTIME', value: 'Injected RPC' },
      { label: 'SIGNING', value: 'Client EIP-712' },
      { label: 'KEY STORAGE', value: '0 Bytes Server' },
      { label: 'DISPATCH', value: 'Autonomous' }
    ],
    cliCommand: 'agentKernel.dispatch({ mode: "autonomous", eip712Sign: "local" })',
    href: '/tokens'
  }
];

export const AudiencesSection: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const { navigate } = usePageTransition();

  const current = BUILDER_SEGMENTS[activeIdx];
  const CurrentIcon = current.icon;

  const handleActionClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <section
      id="who-its-for"
      data-theme="dark"
      className="audiences-section py-24 sm:py-32 px-[max(6.25vw,24px)] w-full bg-[#111215] text-[#f8f6f0] border-t border-white/10 relative overflow-hidden"
    >
      <style>{`
        @keyframes bentoCardIn {
          0% {
            opacity: 0;
            transform: translateY(14px) scale(0.99);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes bentoImgIn {
          0% {
            opacity: 0;
            transform: scale(1.08);
          }
          100% {
            opacity: 0.8;
            transform: scale(1);
          }
        }
        .animate-bento-fade {
          animation: bentoCardIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-bento-img {
          animation: bentoImgIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(250,232,164,0.03),transparent_70%)] pointer-events-none" />

      <div className="max-w-[1360px] mx-auto w-full relative z-10">
        
        {/* Section Header */}
        <div className="mb-12 sm:mb-14 text-center flex flex-col items-center">
          <h2 className="font-unbounded text-2xl sm:text-4xl lg:text-[2.6rem] font-bold tracking-tight text-white leading-[1.15]">
            Built for Sovereign Builders
          </h2>
          <p className="mt-4 text-sm sm:text-base text-white/65 max-w-2xl leading-relaxed font-sans text-center">
            One transparent, non-custodial deployment pipeline designed for viral cultural movements, decentralized protocol architects, and autonomous AI agents.
          </p>
        </div>

        {/* Interactive Segment Navigation Tabs (Top only) */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-3 mb-10 flex-wrap">
          {BUILDER_SEGMENTS.map((seg, idx) => {
            const Icon = seg.icon;
            const isSelected = activeIdx === idx;
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`relative inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-[2px] font-mono text-xs sm:text-sm font-semibold transition-all duration-300 border cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'bg-white text-[#111215] border-white shadow-[0_0_25px_rgba(255,255,255,0.2)] -translate-y-0.5'
                    : 'bg-white/5 text-white/70 border-white/10 hover:border-white/30 hover:bg-white/10 hover:-translate-y-0.5'
                }`}
              >
                <Icon className={`w-4 h-4 transition-colors ${isSelected ? 'text-[#111215]' : 'text-[#fae8a4]'}`} />
                <span>{seg.tabLabel}</span>
                {isSelected && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#fae8a4]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Master Bento Card Display Area (With smooth animated transition on tab change) */}
        <div
          key={current.id}
          className={`animate-bento-fade rounded-[4px] border transition-colors duration-500 overflow-hidden bg-[#16181c] ${current.borderColor} shadow-[0_20px_60px_rgba(0,0,0,0.5)]`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[460px]">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className={`font-mono text-[10px] tracking-widest uppercase font-bold ${current.accentColor}`}>
                    {current.tag}
                  </span>
                  <span className="font-mono text-[9px] tracking-widest px-2 py-0.5 rounded-[2px] bg-white/5 border border-white/10 text-white/70">
                    {current.badge}
                  </span>
                </div>

                <h3 className="font-unbounded text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug mb-4">
                  {current.title}
                </h3>

                <p className="text-sm sm:text-base text-white/70 leading-relaxed font-sans mb-8">
                  {current.desc}
                </p>

                {/* 4 Micro-Metric Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                  {current.metrics.map((m, i) => (
                    <div key={i} className="p-3 bg-white/[0.03] border border-white/10 rounded-[2px] font-mono">
                      <div className="text-[10px] text-white/40 tracking-wider uppercase mb-1">
                        {m.label}
                      </div>
                      <div className={`text-xs sm:text-sm font-semibold truncate ${current.accentColor}`}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CLI Command & CTA Button */}
              <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="p-2.5 bg-black/50 border border-white/10 rounded-[2px] font-mono text-[11px] text-white/70 flex items-center gap-2 overflow-x-auto">
                  <span className="text-[#fae8a4] shrink-0">&gt;</span>
                  <span className="truncate">{current.cliCommand}</span>
                </div>

                <a
                  href={current.href}
                  onClick={(e) => handleActionClick(e, current.href)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#fae8a4] text-[#111215] font-mono text-xs font-bold rounded-[2px] hover:bg-white transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  <span>Launch Rails</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Right Image Feature Column */}
            <div className="lg:col-span-5 relative bg-black/60 min-h-[280px] lg:min-h-full overflow-hidden flex items-center justify-center group">
              <img
                key={current.img}
                src={current.img}
                alt={current.title}
                className="animate-bento-img absolute inset-0 w-full h-full object-cover object-center opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#16181c] via-transparent to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#16181c] via-transparent to-transparent hidden lg:block" />

              <div className="relative z-10 p-6 sm:p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-[2px] bg-black/70 border border-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-lg">
                  <CurrentIcon className={`w-6 h-6 ${current.accentColor}`} />
                </div>
                <span className="font-mono text-xs tracking-wider uppercase text-white/90 font-bold bg-black/60 px-3 py-1 rounded-[2px] border border-white/15 backdrop-blur-sm">
                  {current.badge}
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
