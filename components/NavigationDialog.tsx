"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePageTransition } from './PageTransition';

interface NavigationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSoon?: (feature: string) => void;
}

const navItems = [
  {
    num: '01',
    label: 'Launch Studio',
    href: '#studio',
    sectionHref: '#studio',
    art: '/assets/works_step2.png',
    caption: 'Co-create token drafts with AI Copilot or manually.'
  },
  {
    num: '02',
    label: 'How it works',
    href: '#how-it-works',
    sectionHref: '#how-it-works',
    art: '/assets/works_step4.png',
    caption: 'Four deliberate steps from spark to onchain liquidity.'
  },
  {
    num: '03',
    label: 'Execution Rails',
    href: '#rails',
    sectionHref: '#rails',
    art: '/assets/feat_sovereign_lp.png',
    caption: 'Robinhood Chain V2 direct pools and Solana pump.fun bonding curves.'
  },
  {
    num: '04',
    label: 'Transparency',
    href: '#transparency',
    sectionHref: '#transparency',
    art: '/assets/feat_immutable.png',
    caption: 'Fixed 999M supply, zero taxes, and radical risk disclosures.'
  },
  {
    num: '05',
    label: 'Showcase',
    href: '/tokens',
    sectionHref: '/tokens',
    art: '/assets/feat_receipts.png',
    caption: 'Explore live community-launched coins and verifiable receipts.'
  }
];

export const NavigationDialog: React.FC<NavigationDialogProps> = ({ isOpen, onClose }) => {
  const [activeArt, setActiveArt] = useState(navItems[0]);
  const { navigate } = usePageTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      prevFocus.current = document.activeElement;
      document.body.classList.add('menu-is-open');
      closeRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }
        if (e.key !== 'Tab') return;
        const root = dialogRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.classList.remove('menu-is-open');
        window.removeEventListener('keydown', handleKeyDown);
        (prevFocus.current as HTMLElement | null)?.focus?.();
      };
    } else {
      document.body.classList.remove('menu-is-open');
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    onClose();
    if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
    } else if (href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <dialog
      id="navigation-dialog"
      ref={dialogRef}
      className="navigation-dialog is-open"
      open
      aria-labelledby="nav-title"
    >
      {/* Top Bar */}
      <div className="nav-dialog-top">
        <Link
          className="brand"
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          aria-label="Artemis home"
        >
          <img src="/assets/logo.png" alt="" />
          <span>Artemis</span>
        </Link>
        <button
          ref={closeRef}
          className="menu-close"
          onClick={onClose}
          aria-label="Close navigation"
          type="button"
        >
          CLOSE <span>×</span>
        </button>
      </div>

      {/* Main Experience */}
      <div className="nav-experience">
        {/* Left Column: Index */}
        <div className="nav-index">
          <p id="nav-title" className="eyebrow">THE AUTONOMOUS INDEX</p>

          {navItems.map((item) => (
            <div
              key={item.num}
              className="nav-row"
              data-menu-art={item.art}
              data-caption={item.caption}
              onMouseEnter={() => setActiveArt(item)}
            >
              <a
                className="nav-page-link"
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
              >
                <small>{item.num}</small>
                <span>{item.label}</span>
                <i>↗</i>
              </a>

              <a
                className="nav-section-link"
                href={item.sectionHref}
                onClick={(e) => handleLinkClick(e, item.sectionHref)}
              >
                <small>{item.num}</small>
                <span>{item.label}</span>
                <i>↘</i>
              </a>

              <a
                className="nav-jump"
                href={item.sectionHref}
                onClick={(e) => handleLinkClick(e, item.sectionHref)}
              >
                Jump to section ↘
              </a>
            </div>
          ))}

          <a
            className="nav-launch"
            href="#studio"
            onClick={(e) => handleLinkClick(e, '#studio')}
          >
            <span>Enter your sovereign pool</span>
            <span>OPEN LAUNCH STUDIO ↗</span>
          </a>
        </div>

        {/* Right Column: Dynamic Art Frame */}
        <div className="nav-art">
          <div className="nav-art-frame">
            <img
              id="nav-art-image"
              src={activeArt.art}
              alt={activeArt.label}
              key={activeArt.art}
            />
            <div className="nav-art-cross" aria-hidden="true">+</div>
          </div>
          <p id="nav-art-caption">{activeArt.caption}</p>
          <div className="nav-coordinates">
            <span>ROBINHOOD CHAIN</span>
            <span>SOLANA / AUTONOMOUS RAILS</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="nav-dialog-bottom">
        <span>Sovereign liquidity in every pool.</span>
        <span>NON-CUSTODIAL LAUNCH RAILS</span>
      </div>
    </dialog>
  );
};
