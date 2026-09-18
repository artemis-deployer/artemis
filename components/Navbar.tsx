"use client";

import React, { useEffect, useState } from 'react';
import { TransitionLink } from './PageTransition';
import StatusBadge from './StatusBadge';
import TopbarWallet from './TopbarWallet';

interface NavbarProps {
  onOpenMenu: () => void;
  onOpenSoon?: (feature: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMenu }) => {
  const [isLightNav, setIsLightNav] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const lightElements = document.querySelectorAll('[data-theme="light"], .intro');
      let inLight = false;
      lightElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 80 && rect.bottom >= 80) {
          inLight = true;
        }
      });
      setIsLightNav(inLight);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-20 px-6 md:px-12 flex items-center justify-between z-50 transition-colors duration-500 border-b ${
        isLightNav
          ? 'bg-[#faf8fc]/95 text-[#21172d] border-[#21172d]/10 backdrop-blur-md'
          : 'bg-[#121218]/90 text-[#f5f3f7] border-white/10 backdrop-blur-md'
      }`}
    >
      <TransitionLink href="/" className="flex items-center gap-3 text-2xl font-bold tracking-tight no-underline text-inherit">
        <img src="/assets/logo.png" className="w-9 h-9 rounded-full object-cover" alt="Kentir" />
        <span className="font-unbounded tracking-tighter text-xl md:text-2xl font-bold">Kentir</span>
      </TransitionLink>

      <span className="hidden lg:inline text-xs tracking-[0.14em] uppercase opacity-70 font-mono">
        NON-CUSTODIAL LAUNCHPAD <i className="not-italic mx-2">·</i> ROBINHOOD & SOLANA
      </span>

      <div className="flex items-center gap-3 md:gap-4">
        <StatusBadge />

        <TopbarWallet />

        <TransitionLink
          href="/tokens"
          className={`text-xs md:text-sm font-medium border px-3 py-1.5 rounded transition-all hover:opacity-80 flex items-center gap-1 no-underline ${
            isLightNav ? 'border-[#21172d]/20 text-[#21172d] hover:border-[#21172d]' : 'border-white/20 text-[#f5f3f7] hover:border-white'
          }`}
        >
          SHOWCASE <span>↗</span>
        </TransitionLink>

        <button
          onClick={onOpenMenu}
          className="flex items-center gap-2 text-xs md:text-sm font-semibold tracking-wider hover:opacity-80 py-1.5 pl-2 cursor-pointer bg-transparent border-0 text-inherit"
          aria-label="Open exploration navigation"
        >
          <span className="hidden sm:inline">EXPLORE</span>
          <div className="w-5 h-4 flex flex-col justify-between items-center">
            <span className={`w-full h-0.5 ${isLightNav ? 'bg-[#21172d]' : 'bg-white'}`} />
            <span className={`w-full h-0.5 ${isLightNav ? 'bg-[#21172d]' : 'bg-white'}`} />
            <span className={`w-full h-0.5 ${isLightNav ? 'bg-[#21172d]' : 'bg-white'}`} />
          </div>
        </button>
      </div>
    </header>
  );
};
