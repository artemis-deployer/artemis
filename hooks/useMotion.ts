import { useEffect } from 'react';

export function useMotion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    // 1. Process all headings outside comparison story
    const heads = Array.from(
      document.querySelectorAll<HTMLElement>('main h1, main h2, .footer-cta h2')
    ).filter(h => !h.closest('.comparison-story'));

    heads.forEach(h => {
      if (h.classList.contains('bar-heading')) return;
      h.classList.add('bar-heading');

      let index = 0;
      const walk = (node: Node) => {
        const children = Array.from(node.childNodes);
        children.forEach(c => {
          if (c.nodeType === Node.TEXT_NODE && c.textContent) {
            const fragment = document.createDocumentFragment();
            const words = c.textContent.split(/(\s+)/);
            words.forEach(word => {
              if (!word.trim()) {
                fragment.append(document.createTextNode(word));
              } else {
                const s = document.createElement('span');
                s.className = 'heading-word';
                s.style.setProperty('--word-i', String(Math.min(index++, 9)));
                s.textContent = word;
                fragment.append(s);
              }
            });
            c.replaceWith(fragment);
          } else if (c.nodeType === Node.ELEMENT_NODE && (c as Element).tagName !== 'BR') {
            walk(c);
          }
        });
      };
      walk(h);
    });

    // 2. Setup IntersectionObserver for motion targets
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.bar-heading, .work-card, .stair-cards article, .tech-grid > div, .audience, .policy-card, .transparency-art, .disclosures details, .footer-cta'
      )
    );

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('motion-entered');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -24px 0px' }
    );

    const startObserving = () => {
      targets.forEach((e, i) => {
        if (!e.classList.contains('motion-target')) {
          e.classList.add('motion-target');
          const stagger = (e.parentElement ? Array.from(e.parentElement.children).indexOf(e) % 4 : i % 4) * 85;
          e.style.setProperty('--stagger', `${stagger}ms`);
        }
        observer.observe(e);
      });
    };

    let checkPendingTimer: ReturnType<typeof setTimeout> | null = null;
    let failsafeTimer: ReturnType<typeof setTimeout> | null = null;
    if (document.body.classList.contains('arrival-pending')) {
      const checkPending = () => {
        if (!document.body.classList.contains('arrival-pending')) {
          startObserving();
        } else {
          checkPendingTimer = setTimeout(checkPending, 60);
        }
      };
      checkPendingTimer = setTimeout(checkPending, 60);
      // Failsafe in case arrival-pending takes too long
      failsafeTimer = setTimeout(() => {
        if (checkPendingTimer) clearTimeout(checkPendingTimer);
        startObserving();
      }, 2000);
    } else {
      startObserving();
    }

    // 3. Scroll listener for intro section reading scrub
    const intro = document.querySelector<HTMLElement>('.intro');
    let scheduled = false;
    let rafId = 0;

    const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

    const render = () => {
      scheduled = false;
      const vh = window.innerHeight;
      if (intro) {
        const r = intro.getBoundingClientRect();
        const progress = clamp((vh - r.top) / (vh + r.height));
        intro.style.setProperty('--intro-shift', String(progress));
        const words = intro.querySelectorAll<HTMLElement>('.heading-word');
        words.forEach((w, i) => {
          w.style.opacity = String(clamp((progress * 1.9 - i / words.length) * 3, 0.22));
        });
      }
    };

    const onScroll = () => {
      if (!scheduled) {
        scheduled = true;
        rafId = requestAnimationFrame(render);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', render);
    render();

    return () => {
      if (checkPendingTimer) clearTimeout(checkPendingTimer);
      if (failsafeTimer) clearTimeout(failsafeTimer);
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', render);
    };
  }, []);
}
