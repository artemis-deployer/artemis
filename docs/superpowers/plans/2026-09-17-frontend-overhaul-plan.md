# Frontend Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Artemis launchpad frontend into a beautiful, cohesive, and modern Web3 UI while preserving the signature warm paper and crimson editorial aesthetic, with clean Tailwind v4 styling, Lucide icons, Framer Motion animations, split-studio layout, and an enhanced showcase page.

**Architecture:** Next.js 16 App Router client components with a centralized draft state, decoupled studio chat, modern launch configuration form, interactive 3D character stage, modular wallet connectors, and animated review dialog modal.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Lucide React, Framer Motion, Three.js, Viem, @solana/web3.js.

## Global Constraints
- Retain warm paper (`#fff9f1`), crimson (`#b82535`), and rich ink (`#141210`) palette.
- No glassmorphism, no neon cyberpunk gradients.
- Non-custodial security principles remain strictly intact.
- Vitest test suite must stay 100% passing across all existing tests.
- Commits in English only.

---

### Task 1: Styling System & Layout Shell
- Refactor `app/globals.css` with structured utility classes, semantic CSS variables, responsive typography, and refined button/card styling.
- Update `app/layout.tsx` with proper metadata, viewport, and semantic fonts.

### Task 2: Header, StatusBadge & Navigation
- Build a responsive sticky Topbar with brand logo, navigation links, AI StatusBadge (online/offline indicator with pulsing dot), and testnet warning pill.

### Task 3: Interactive 3D Character Pedestal
- Refine `components/CharacterStage.tsx`: place the 3D character in a styled framed stage/pedestal, smooth out mouse drag and keyboard rotation, and provide clean control buttons.

### Task 4: Studio Workspace (Chat & Form Split)
- Upgrade `components/StudioChat.tsx` with chat message bubbles, clear user vs Artemis distinction, character count, auto-expanding/comfortable textarea, and suggestion buttons.
- Upgrade `components/LaunchForm.tsx` with visual chain selection cards, live ratio & price preview, clear validation highlights, and consent banner.
- Organize `app/page.tsx` into a responsive two-column Studio Workspace.

### Task 5: Review & Wallet Modal
- Modernize `components/ReviewDialog.tsx` with structured token breakdown, step-by-step transaction state tracker (Deploy -> Liquidity / PumpPortal), explorer links, and wallet action buttons.
- Polish `components/WalletButton.tsx` and `components/SolanaButton.tsx` with address shortening and connected chips.

### Task 6: Educational & Landing Sections
- Redesign "How it works" 4-step cards with numbered badges.
- Redesign "Choose your chain" comparison cards with rail feature tags.
- Polish Honest Risks section and Call to Action footer banner.

### Task 7: Showcase Page (`/tokens`)
- Redesign `app/tokens/page.tsx` with search input, chain filter pills (All / Robinhood / Solana / Local), token cards with copy-address button, explorer link, and empty state.

### Task 8: Verification & Test Suite
- Run `npm test` and `npm run build` / `npm run lint` to verify all components compile and pass tests.
