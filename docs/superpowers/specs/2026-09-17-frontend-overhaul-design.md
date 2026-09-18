# Frontend Overhaul Spec — Artemis Launchpad

Date: 2026-09-17. Status: Approved by user.

## 1. Objective
Overhaul the frontend UI/UX of Artemis while preserving its signature warm paper (`#fff9f1`), deep crimson (`#b82535`), and rich ink (`#141210`) editorial aesthetic. Transform the messy layout into a cohesive, responsive, and polished Web3 launchpad with split-studio workflow, interactive 3D character pedestal, comprehensive status indicators, refined forms, and a complete token showcase.

## 2. Design System & Tokens
- **Backgrounds**: Canvas paper `#FFF9F1`, Surface card `#FFFFFF`, Subtle blush `#FBE9E4`, Dark card `#141210`.
- **Primary Accent**: Crimson `#B82535`, Dark crimson `#8F1B29`, Accent text `#FFFFFF`.
- **Secondary Accent**: Gold `#C99B48` (warnings/accents), Emerald `#16A34A` (online/success).
- **Ink**: Headings `#141210`, Body/Muted `#6B6259`, Warm border `#EADFD2`.
- **Radii**: 12px card radius, 8px controls, 999px pills/buttons.
- **Iconography**: Lucide React SVG icons.
- **Motion**: Framer Motion for smooth tab switches, collapsible drawer, dialog transitions, and chat stream effects.

## 3. Architecture & Pages
- **Top Navigation Bar**: Brand mark, links to Studio, Showcase, How It Works, Docs, Live AI status pill, and Network indicator.
- **Hero & 3D Character**:
  - Balanced 2-column or centered hero layout.
  - Interactive 3D Icosahedron/Artemis character inside a framed pedestal card with smooth drag-to-rotate, arrow controls, and reset view button.
  - Value proposition and jump links.
- **Split Studio**:
  - Left column: Studio AI Chat with message bubbles, quick suggestions, character counter, typing indicator, and draft parser sync.
  - Right column: Token Launch Form with visual chain cards (Robinhood Chain vs Solana), live calculation of liquidity ratio / initial price, validation messages, and "Review Launch" CTA.
- **Review Dialog Modal**:
  - Animated backdrop and modal container.
  - Detailed token launch summary.
  - Multi-step execution tracker (Token Deploy -> Pool Funding for EVM, IPFS Upload -> Sign & Broadcast for Solana).
  - Wallet connector buttons with connected address chips and chain auto-switch.
  - Local receipt persistence and resume action buttons.
- **Feature & Education Sections**:
  - 4-step progressive launch cards.
  - Chain comparison cards with rail specifications.
  - Honest risks alert card.
  - Call to action banner.
- **Showcase Page (`/tokens`)**:
  - Clean search & network tab filters (All / Robinhood / Solana / Local).
  - Token cards with status badges, copy contract address button, explorer link, and timestamp.
  - Empty state with action link to launch a token.
- **New /docs or /how-it-works information section**:
  - Clear explanations of direct pools, bonding curves, and non-custodial wallet security.
