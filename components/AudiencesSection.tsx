"use client";

import React, { useState } from 'react';

const audiences = [
  {
    theme: 'bg-[#1a1b1f] border-[#cadcf0]/30',
    tag: 'COMMUNITY CREATORS & CULTS',
    title: 'Turn inside jokes and\nmovements into real onchain\nliquidity without custody.',
    img: '/assets/walkways.png'
  },
  {
    theme: 'bg-[#1a1b1f] border-[#fae8a4]/30',
    tag: 'WEB3 DEVELOPERS & PROTOCOLS',
    title: 'Deploy verified ERC20\ntokens directly to DEX pools\nwith zero admin backdoors.',
    img: '/assets/terrain.png'
  }
];

export const AudiencesSection: React.FC = () => {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex(0);
  const next = () => setIndex(1);

  return (
    <section
      id="who-its-for"
      data-theme="dark"
      className="audiences-section py-28 px-[max(6.25vw,24px)] w-full bg-[#131416] text-[#f8f6f0]"
    >
      <div className="max-w-[1800px] mx-auto w-full">
        <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white mb-4">
            Built for Sovereign Builders
          </h2>
          <p className="text-white/60 text-base md:text-lg max-w-lg leading-relaxed">
            One transparent deployment pipeline, whether launching an experimental meme or seeding DAO governance.
          </p>
        </div>

        {/* Carousel controls */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            className="w-12 h-12 rounded border border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xl transition-colors cursor-pointer text-white"
            aria-label="Previous audience"
          >
            ←
          </button>
          <button
            type="button"
            onClick={next}
            disabled={index === 1}
            className="w-12 h-12 rounded border border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xl transition-colors cursor-pointer text-white"
            aria-label="Next audience"
          >
            →
          </button>
        </div>
      </div>

      <div className="audience-viewport overflow-hidden">
        <div
          className="flex gap-6 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(calc(-${index * 100}% - ${index * 24}px))` }}
        >
          {audiences.map((aud, i) => (
            <article
              key={i}
              className={`flex-none w-full min-h-[480px] grid grid-cols-1 md:grid-cols-5 border rounded-lg overflow-hidden shadow-2xl ${aud.theme}`}
            >
              <div className="md:col-span-2 h-64 md:h-full bg-black/40 overflow-hidden">
                <img
                  src={aud.img}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="md:col-span-3 p-8 md:p-14 flex flex-col justify-between">
                <h3 className="font-sans text-2xl sm:text-3xl md:text-4xl font-light tracking-tight leading-snug whitespace-pre-line text-white">
                  {aud.title}
                </h3>
                <p className="text-xs md:text-sm font-mono tracking-widest text-[#fae8a4] uppercase text-right pt-8 border-t border-white/10">
                  {aud.tag}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
};
