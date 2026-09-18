"use client";

import React, { useState } from 'react';
import { usePageTransition } from './PageTransition';

interface NavigationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSoon: (feature: string) => void;
}

const navItems = [
  {
    num: '01',
    label: 'Launch Studio',
    href: '#studio',
    art: '/assets/terrain.png',
    caption: 'Co-create token drafts with AI Copilot or manually.'
  },
  {
    num: '02',
    label: 'How It Works',
    href: '#how-it-works',
    art: '/assets/walkways.png',
    caption: 'Four deliberate steps from idea to onchain liquidity.'
  },
  {
    num: '03',
    label: 'Launch Rails',
    href: '#rails',
    art: '/assets/orbital.png',
    caption: 'Robinhood Chain V2 direct pools and Solana pump.fun bonding curves.'
  },
  {
    num: '04',
    label: 'Token Showcase',
    href: '/tokens',
    art: '/assets/pyramids.png',
    caption: 'Explore live community-launched coins and local receipts.'
  },
  {
    num: '05',
    label: 'Transparency',
    href: '#transparency',
    art: '/assets/terrain.png',
    caption: 'Zero hidden mints, fixed 999M supply, and radical risk disclosures.'
  }
];

export const NavigationDialog: React.FC<NavigationDialogProps> = ({ isOpen, onClose }) => {
  const [activeArt, setActiveArt] = useState(navItems[0]);
  const { navigate } = usePageTransition();

  if (!isOpen) return null;

  const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/')) {
      e.preventDefault();
      onClose();
      navigate(href);
    } else {
      onClose();
    }
  };

  return (
    <div className="navigation-dialog-animate fixed inset-0 z-[100] bg-[#15121e] text-[#f7f3fa] flex flex-col justify-between overflow-y-auto">
      {/* Top bar */}
      <div className="nav-dialog-top px-[max(6.25vw,24px)]">
        <div className="brand flex items-center gap-[9px] text-[24px] font-bold tracking-tight text-white font-unbounded">
          <img src="/assets/logo.png" className="w-[26px] h-[26px] rounded-full object-cover" alt="" />
          <span>Kentir</span>
        </div>
        <button
          onClick={onClose}
          className="menu-close"
          aria-label="Close navigation"
        >
          CLOSE <span>×</span>
        </button>
      </div>

      {/* Main navigation experience */}
      <div className="w-full max-w-[1700px] mx-auto px-[max(6.25vw,24px)] grid grid-cols-1 lg:grid-cols-12 gap-12 my-auto py-8">
        {/* Left column: links */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#dac2ee]/70 font-mono">AUTONOMOUS DIRECTORY</p>
          <div className="space-y-4">
            {navItems.map((item) => (
              <a
                key={item.num}
                href={item.href}
                onClick={(e) => handleItemClick(e, item.href)}
                onMouseEnter={() => setActiveArt(item)}
                className="group flex items-center justify-between border-b border-white/10 pb-4 text-3xl md:text-5xl font-light hover:text-[#e4cef7] transition-all"
              >
                <div className="flex items-center gap-6">
                  <span className="text-xs text-[#dac2ee]/60 font-mono">{item.num}</span>
                  <span className="tracking-tight">{item.label}</span>
                </div>
                <span className="text-2xl text-white/30 group-hover:text-[#e4cef7] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                  ↗
                </span>
              </a>
            ))}
          </div>

          <div className="pt-6">
            <a
              href="#studio"
              onClick={onClose}
              className="dp-button w-full sm:w-auto"
            >
              <span>OPEN LAUNCH STUDIO</span>
              <span className="arrow-box">↘</span>
            </a>
          </div>
        </div>

        {/* Right column: dynamic preview art */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-center items-center">
          <div className="relative w-80 h-80 rounded-lg overflow-hidden border border-white/15 bg-black/40 shadow-2xl p-3 flex flex-col items-center justify-center">
            <img
              src={activeArt.art}
              alt=""
              className="w-full h-full object-cover rounded transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute top-4 right-4 text-white/40 text-sm font-mono">+</div>
          </div>
          <p className="mt-4 text-sm text-center text-white/70 max-w-xs">{activeArt.caption}</p>
          <div className="mt-3 flex gap-4 text-[10px] tracking-widest text-[#dac2ee]/60 uppercase font-mono">
            <span>ROBINHOOD CHAIN</span>
            <span>·</span>
            <span>SOLANA PUMP.FUN</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="nav-dialog-bottom mx-[max(6.25vw,24px)] flex justify-between border-t border-white/10 py-5 text-[11px] text-[#aa96ba] tracking-wider">
        <span>Non-custodial sovereign liquidity.</span>
        <span className="uppercase">100% CLIENT SIGNATURES</span>
      </div>
    </div>
  );
};
