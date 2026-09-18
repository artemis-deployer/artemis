"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface PageTransitionContextValue {
  navigate: (href: string) => void;
}

const PageTransitionContext = createContext<PageTransitionContextValue>({
  navigate: () => {},
});

export const usePageTransition = () => useContext(PageTransitionContext);

export const PageTransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [transitionState, setTransitionState] = useState<'' | 'leaving' | 'entering'>('');
  const [, startTransition] = useTransition();
  const prevPathname = useRef(pathname);

  const navigate = (href: string) => {
    // If external link or anchor on current page, proceed immediately
    if (href.startsWith('http') || href.startsWith('#')) {
      if (href.startsWith('#')) {
        const el = document.querySelector(href);
        el?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    // Check reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      router.push(href);
      return;
    }

    // Trigger leaving transition (blue -> lavender -> pink -> dark wipe)
    setTransitionState('leaving');

    setTimeout(() => {
      startTransition(() => {
        router.push(href);
      });
    }, 520);
  };

  // When pathname changes after navigation, trigger entering animation
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      const raf = requestAnimationFrame(() => {
        setTransitionState('entering');
      });
      const timer = setTimeout(() => {
        setTransitionState('');
      }, 700);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, [pathname]);

  return (
    <PageTransitionContext.Provider value={{ navigate }}>
      {children}
      {/* 4-layer sliding transition panels from darkpoolfi.tech */}
      <div className={`transition-panels ${transitionState}`} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
    </PageTransitionContext.Provider>
  );
};

export const TransitionLink: React.FC<{
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}> = ({ href, className = '', children, onClick }) => {
  const { navigate } = usePageTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let browser handle special clicks (Cmd/Ctrl + click, new tab, right click)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }

    e.preventDefault();
    if (onClick) onClick();
    navigate(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};
