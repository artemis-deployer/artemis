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
    <header className={`nav ${isLightNav ? 'light-nav' : ''}`}>
      <TransitionLink href="/" className="brand" aria-label="Kentir home">
        <img src="/assets/logo.png" alt="" />
        <span>Kentir</span>
      </TransitionLink>

      <span className="nav-context">
        NON-CUSTODIAL LAUNCHPAD <i>·</i> ROBINHOOD &amp; SOLANA
      </span>

      <div className="nav-actions">
        <StatusBadge />

        <TopbarWallet />

        <TransitionLink
          href="/tokens"
          className="nav-cta"
        >
          <span>SHOWCASE</span> <span>↗</span>
        </TransitionLink>

        <button
          type="button"
          onClick={onOpenMenu}
          className="menu-toggle"
          aria-label="Open exploration navigation"
          aria-expanded="false"
        >
          <span className="menu-label">EXPLORE</span>
          <span className="hamburger" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
      </div>
    </header>
  );
};
