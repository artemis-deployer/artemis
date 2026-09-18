"use client";

import React, { useState } from 'react';
import { DraftProvider } from '../components/DraftContext';
import { ArrivalPreloader } from '../components/ArrivalPreloader';
import { InkTrail } from '../components/InkTrail';
import { Navbar } from '../components/Navbar';
import { NavigationDialog } from '../components/NavigationDialog';
import { SoonModal } from '../components/SoonModal';
import { HeroSection } from '../components/HeroSection';
import { IntroSection } from '../components/IntroSection';
import { FeatureSection } from '../components/FeatureSection';
import { StudioSection } from '../components/StudioSection';
import { WorksSection } from '../components/WorksSection';
import { StepsSection } from '../components/StepsSection';
import { TechnologySection } from '../components/TechnologySection';
import { AudiencesSection } from '../components/AudiencesSection';
import { ComparisonSection } from '../components/ComparisonSection';
import { ExecutionSection } from '../components/ExecutionSection';
import { TransparencySection } from '../components/TransparencySection';
import { Footer } from '../components/Footer';
import { useMotion } from '../hooks/useMotion';

function MainApp() {
  useMotion();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [soonFeature, setSoonFeature] = useState<string | null>(null);

  const handleOpenSoon = (feature: string) => {
    setSoonFeature(feature);
  };

  const handleCloseSoon = () => {
    setSoonFeature(null);
  };

  return (
    <div className="relative min-h-screen bg-[#121218] text-[#f5f3f7] selection:bg-[#e4cef7] selection:text-[#17131f] font-sans">
      {/* Editorial Arrival Redaction Splash */}
      <ArrivalPreloader />

      {/* Interactive Cursor Ink Trail */}
      <InkTrail />

      {/* Top Floating Navbar with Theme Transition */}
      <Navbar
        onOpenMenu={() => setIsMenuOpen(true)}
        onOpenSoon={handleOpenSoon}
      />

      {/* Fullscreen Explore Navigation Dialog with 3D Art Preview */}
      <NavigationDialog
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpenSoon={handleOpenSoon}
      />

      {/* Coming Soon Feature Modal */}
      <SoonModal
        isOpen={soonFeature !== null}
        feature={soonFeature || ''}
        onClose={handleCloseSoon}
      />

      {/* Main Landing Page Content */}
      <main id="main">
        {/* 1. Hero Section */}
        <HeroSection onOpenSoon={handleOpenSoon} />

        {/* 2. Intro Section with 3D Blocky Grid & Scrubbed Reading Opacity */}
        <IntroSection onOpenSoon={handleOpenSoon} />

        {/* 3. Protocol Features Infinite Marquee */}
        <FeatureSection />

        {/* 4. Interactive Launch Studio (Copilot & Manual Drafts) */}
        <StudioSection />

        {/* 5. How It Works - Sticky Stacking Card Deck */}
        <WorksSection onOpenSoon={handleOpenSoon} />

        {/* 6. Four Steps with Mechanical Rolling Digit Reels & Principle Ticker */}
        <StepsSection />

        {/* 7. Technology & Window Mechanics Geometric Cards */}
        <TechnologySection />

        {/* 8. Audiences Carousel Slider */}
        <AudiencesSection />

        {/* 9. Pinned Scroll Comparison Scene (Custodial vs. Kentir) */}
        <ComparisonSection />

        {/* 10. Execution Rails Toggle & Cards */}
        <ExecutionSection onOpenSoon={handleOpenSoon} />

        {/* 11. Transparency & Disclosures Accordion */}
        <TransparencySection onOpenSoon={handleOpenSoon} />
      </main>

      {/* 12. Footer with Huge Watermark & Pixels */}
      <Footer onOpenSoon={handleOpenSoon} />
    </div>
  );
}

export default function Home() {
  return (
    <DraftProvider>
      <MainApp />
    </DraftProvider>
  );
}
