# Robinhood Editorial Palette Implementation Plan

> **Goal:** Migrate theme and components from pastel tri-color (lavender, baby pink, sky blue) to Robinhood Editorial (Buttercream `#fae8a4`, Oxford Mist `#cadcf0`, Warm Sand `#ece4d4`) on a deep graphite ink base (`#131416`) with high-contrast text (`#18191c`).
> **Spec Reference:** `docs/superpowers/specs/2026-09-18-robinhood-editorial-palette-design.md`

## Proposed Changes

### 1. Global Styles & Design Tokens
- **`app/globals.css`**: Update `@theme` tokens and `:root` variables. Update selection colors and replace hardcoded pastel values in utility classes.

### 2. Canvas & Shader Tuning
- **`components/BlockyGridCanvas.tsx`**: Update `CONFIG` colors (`bgColor`, `underColor`, `shadeColor`).
- **`components/InkTrail.tsx`**: Update `inkColor` to `#fae8a4`.
- **`components/FloatingPixels.tsx`**: Update `colors` array.
- **`components/PageTransition.tsx`**: Update sliding transition panels order/colors.

### 3. Sections & Layout Components
- **`components/ArrivalPreloader.tsx`**: Update redaction and colophon rules styling.
- **`components/HeroSection.tsx`**: Update router verification chip highlight.
- **`components/IntroSection.tsx`**: Update section background and radial ambient glow.
- **`components/StudioChat.tsx` & `components/StudioSection.tsx`**: Update Copilot avatar, prompt suggestion pills, apply button, user bubble.
- **`components/LaunchForm.tsx`**: Update live token preview stamp and active network buttons.
- **`components/WorksSection.tsx`**: Update 3 sticky cards backgrounds (`#cadcf0`, `#fae8a4`, `#ece4d4`).
- **`components/StepsSection.tsx`**: Update step stair cards backgrounds and principle marquee colors.
- **`components/ComparisonSection.tsx`**: Update Kentir Card 2 background and geometry accents.
- **`components/ExecutionSection.tsx`**: Update active rail cards.
- **`components/TransparencySection.tsx` & `components/TechnologySection.tsx`**: Update card themes.
- **`components/Footer.tsx` & `components/NavigationDialog.tsx`**: Update accent links, tags, and footer wordmark tint.
- **`app/tokens/page.tsx`**: Update filter buttons, active pills, ticker accents.

---

## Verification Plan

### Automated Tests
- Run `npm test` to verify zero functional regression across all test suites.
- Run `npm run build` to verify TypeScript compile and CSS bundling.

### Manual Visual Checks
- Verify contrast of dark text on buttercream, mist, and sand backgrounds.
- Verify canvas effects (ink trail, 3D grid) blend seamlessly with new background tones.
