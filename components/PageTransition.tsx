"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from 'react';
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
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failsafeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sync guard: state lags a tick, so rapid double-navigate bypasses the check.
  const transitioningRef = useRef(false);

  const clearPendingTimers = () => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    if (failsafeTimer.current) clearTimeout(failsafeTimer.current);
    pushTimer.current = null;
    failsafeTimer.current = null;
  };

  // ponytail: stable fn + value identity, else all TransitionLinks re-render per provider render
  const navigate = useCallback((href: string) => {
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

    // Same-path navigation never triggers the pathname effect, so skip the
    // wipe entirely instead of leaving the overlay stuck in "leaving".
    if (href === pathname) {
      router.push(href);
      return;
    }

    // Ignore re-entrant navigations while a transition is already running.
    if (transitioningRef.current || transitionState !== '') {
      return;
    }

    // Trigger leaving transition (blue -> lavender -> pink -> dark wipe)
    transitioningRef.current = true;
    setTransitionState('leaving');

    clearPendingTimers();
    pushTimer.current = setTimeout(() => {
      startTransition(() => {
        router.push(href);
      });
    }, 520);
    // Failsafe: if router.push fails the pathname effect never fires, so
    // release the overlay instead of leaving the wipe stuck on screen.
    failsafeTimer.current = setTimeout(() => {
      transitioningRef.current = false;
      setTransitionState((prev) => (prev === 'leaving' ? '' : prev));
    }, 3000);
  }, [router, pathname, transitionState]);

  const value = useMemo(() => ({ navigate }), [navigate]);

  // When pathname changes after navigation, trigger entering animation
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      if (failsafeTimer.current) clearTimeout(failsafeTimer.current);
      failsafeTimer.current = null;
      const raf = requestAnimationFrame(() => {
        setTransitionState('entering');
      });
      const timer = setTimeout(() => {
        transitioningRef.current = false;
        setTransitionState('');
      }, 700);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, [pathname]);

  // Release pending timers if the provider unmounts mid-transition.
  useEffect(() => {
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      if (failsafeTimer.current) clearTimeout(failsafeTimer.current);
    };
  }, []);

  return (
    <PageTransitionContext.Provider value={value}>
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
