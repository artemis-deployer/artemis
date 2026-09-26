"use client";

import React, { useEffect, useState } from 'react';
import { TransitionLink } from './PageTransition';
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
      <TransitionLink href="/" className="brand" aria-label="Artemis home">
        <img src="/assets/logo.webp" alt="Artemis" />
      </TransitionLink>

      <span className="nav-context">
        NON-CUSTODIAL LAUNCHPAD <i>·</i> ROBINHOOD &amp; SOLANA
      </span>

      <div className="nav-actions">
        <TopbarWallet />

        <div className="nav-cta-group">
          <TransitionLink
            href="/tokens"
            className="nav-cta"
          >
            <span>SHOWCASE</span> <span>↗</span>
          </TransitionLink>

          <a
            href="https://x.com/artemislauncher"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Artemis on X"
            title="Artemis on X"
            className="nav-social"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l8.2-9.4L1 2h6.5l5.8 7.7L18.9 2ZM17.8 20h1.7L6.5 4H4.7z" />
            </svg>
          </a>
        </div>

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
          </span>
        </button>
      </div>
    </header>
  );
};
