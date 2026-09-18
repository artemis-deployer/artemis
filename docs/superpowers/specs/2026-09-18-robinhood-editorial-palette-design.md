# Design Spec: Robinhood Editorial Palette Migration

- **Date**: 2026-09-18
- **Topic**: Palette migration to "Robinhood Editorial" (Buttercream · Oxford Mist · Warm Sand)
- **Status**: Approved by user

## 1. Objective
Replace the existing pastel/lavender tri-color scheme (`#e4cef7`, `#f1d2e8`, `#b9e2f8`) with a mature, non-neon, non-AI-slop palette inspired by Robinhood's signature gold/yellow tone adapted into DarkpoolFi's editorial matte paper-and-ink structure.

## 2. Color Mapping Architecture

| Token Role | Old Value | New "Robinhood Editorial" | Semantic Purpose |
|---|---|---|---|
| **Base Dark** | `#121218` | `#131416` | Main body & dark surface background |
| **Card Dark** | `#18171f` | `#1a1b1f` | Studio, comparison card 1, nav dropdowns |
| **Paper Light** | `#f8f7fa` | `#f8f6f0` | Light sections (steps, transparency, execution) |
| **Ink Text** | `#17131f` / `#21172d` | `#18191c` | High-contrast dark text on paper/cards |
| **Block 1 (Primary / Hero)** | `#e4cef7` (Lavender) | `#fae8a4` (Buttercream / Pale Gold) | Main buttons, token badges, live preview, hero accents |
| **Block 2 (Secondary)** | `#b9e2f8` (Baby Blue) | `#cadcf0` (Oxford Mist) | EVM/DEX cards, cool contrast blocks |
| **Block 3 (Tertiary)** | `#f1d2e8` (Powder Pink) | `#ece4d4` (Oat / Warm Sand) | Stacking card 3, alternate steps |

## 3. Canvas & Shader Tuning

1. **`BlockyGridCanvas.tsx`**:
   - `bgColor`: `#ece4d4` (Warm Sand base)
   - `underColor`: `#cadcf0` (Oxford Mist side reveal)
   - `edgeColor`: `#ffffff` (Clean top rim highlight)
   - `shadeColor`: `#c4bbae` (Warm shadow)
2. **`InkTrail.tsx`**:
   - `inkColor`: `#fae8a4` (Soft gold ink bleed)
3. **`FloatingPixels.tsx`**:
   - Palette array: `['#fae8a4', '#cadcf0', '#ece4d4', '#e2d3b8']`
4. **`PageTransition.tsx`**:
   - Panels: Oxford Mist (`#cadcf0`) → Buttercream (`#fae8a4`) → Warm Sand (`#ece4d4`) → Dark Base (`#131416`).

## 4. Affected Component Scope
- `app/globals.css`: `@theme` tokens, `:root` CSS variables, selection colors, hardcoded `#e4cef7`/`#f1d2e8`/`#b9e2f8` utilities.
- `components/ArrivalPreloader.tsx`: Header brand, redaction bar, colophon rules.
- `components/HeroSection.tsx`: Router pill border/text colors.
- `components/IntroSection.tsx`: Background tone shifted from `#e5c0ef` to `#ece4d4` or matching ambient gradient.
- `components/StudioSection.tsx` & `StudioChat.tsx`: Copilot avatar, prompt suggestions, "Apply to form" buttons, user bubble colors.
- `components/LaunchForm.tsx`: Ticker stamp preview, network selector active borders, review triggers.
- `components/WorksSection.tsx`: Sticky stacking card decks (Card 1: Oxford Mist, Card 2: Buttercream, Card 3: Warm Sand).
- `components/StepsSection.tsx`: Step stair cards and principle marquee.
- `components/ComparisonSection.tsx`: Comparison Card 2 (Kentir) background changed to Buttercream `#fae8a4`.
- `components/ExecutionSection.tsx`: Robinhood and Solana rail active cards.
- `components/TransparencySection.tsx`: Art banner and link accents.
- `components/TechnologySection.tsx`: Tech cards color theme utilities.
- `components/NavigationDialog.tsx` & `Footer.tsx`: Active links, CTA banners, watermark tint.
- `app/tokens/page.tsx`: Catalog filter pills, ticker badges, copy buttons.

## 5. Verification Plan
1. Re-run `npm test` to ensure zero regression in logic/route tests.
2. Run `npm run build` to verify TypeScript compile & CSS bundling with zero errors.
