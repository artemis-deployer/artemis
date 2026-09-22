# ARTEMIS — Project Report & Architecture Overview

**Autonomous Non-Custodial Token Launchpad for Robinhood Chain (EVM) & Solana**

- **Web Application:** https://artemis-olive.vercel.app
- **Token Showcase:** https://artemis-olive.vercel.app/tokens
- **GitHub Repository:** https://github.com/artemis-deployer/artemis

---

## 1. Project Description

**Artemis** is a non-custodial token launchpad that turns a chat conversation into a live on-chain token. A user describes a coin idea to an AI copilot, reviews exact launch parameters, then signs from their own wallet. The server never signs and never holds funds.

On **Robinhood Chain mainnet (4663)** the flagship path is a single atomic transaction: deploy a fixed-supply ERC20 and fund its Uniswap V2 pool in one call via `ArtemisLauncher`. Either everything lands or the whole call reverts (minus gas). LP tokens and leftover supply go straight to the creator; the launcher holds zero funds after the call. The contract is source-verified on Blockscout and proven live with the ASIF launch (token + pool + LP, block 67920183).

On **Robinhood Testnet (46630)** the same UI rehearses the deploy as a token-only drill (no V2 router exists on testnet, so the pool step is honestly stubbed). On **Solana**, the pump.fun rail builds metadata, pins artwork to IPFS, and constructs the bonding-curve transaction for wallet signature (currently parked behind a "coming soon" gate while EVM is the live rail).

---

## 2. Core Value Proposition & Problem Solved

### The Problem

- **Launcher complexity:** Deploying a token plus seeding a pool normally means manual contract deployment, approvals, router calls, and leftover-supply handling across several transactions — each step a chance to misconfigure or lose funds.
- **Parameter guessing:** Supply, pool allocation, slippage, and deadlines are set blind. Users over- or under-fund pools and get frontrun or reverted transactions.
- **Fake showcase listings:** Open token catalogs accept any address + transaction hash pair, so scam listings piggyback on unrelated transactions.
- **Lost artwork:** Token images live offchain with no enforced shape, producing broken or inconsistent catalog cards.

### The Artemis Solution

- **One-transaction atomic launch:** `ArtemisLauncher.launch()` deploys the token, approves the router, funds the pool, sweeps the remainder, and emits `Launched` — all or nothing.
- **AI draft copilot:** An OpenAI-compatible chat endpoint (Mimo default) converts free text into a structured draft (name, ticker, pool allocation, liquidity, chain), with sanitization, race-safe auto-patch, and strict server-side validation.
- **Exact pre-sign review:** Live gas estimation, slippage presets (0.5 / 2 / 5 %), chain-time deadlines (+600 s), balance checks, and router authenticity verification (WETH + factory + bytecode) before any signature.
- **Proof-gated showcase:** Listings are accepted only with onchain proof — a creation transaction or a pool transaction from the creator into a trusted router/factory/launcher with the token in the logs. Touch-only transactions prove nothing and are rejected.
- **Enforced 1:1 artwork:** A built-in crop modal (drag + zoom, 512 px output) guarantees square artwork; EVM images pin to IPFS for the showcase, Solana images ride the pump.fun metadata.

---

## 3. End-to-End Application Flow

```
[User]
   │
   ▼
1. Studio chat (AI copilot) or manual form
   ├── Draft: name / ticker / pooled / liquidity / chain / image
   ├── validateDraft + sanitizeDraft + resolveAutoPatch
   └── Artwork: file → 1:1 crop modal → IPFS pin (EVM) / metadata (Solana)
   │
   ▼
2. Review Launch Parameters dialog
   ├── estimateLaunchCost (live gas + fee + steps)
   ├── connectWallet + ensureChain (4663 | 46630)
   ├── validateRouter (WETH + factory + code match)
   └── Slippage preset + 10-min chain-time deadline
   │
   ▼
3. Execute (branch by chain)
   ├── Mainnet 4663 → launchOneTx (1 atomic tx via ArtemisLauncher)
   ├── Testnet 46630 → deployToken → addLiquidity (2-step + resume guard)
   └── Solana → PumpPortal trade-local (parked: disabled)
   │
   ▼
4. Receipt + showcase
   ├── saveReceipt (localStorage, newest-first, cap 50)
   ├── POST /api/community/tokens → verifyEvmTx / verifySolanaTx
   ├── saveToken (Postgres) → listed, else pending
   └── GET /tokens → community grid + local receipt cards
```

---

## 4. Key Architectural Components

### A. Atomic launcher contracts (`contracts/`)

- `ArtemisToken.sol` — Minimal fixed-supply ERC20 (name, symbol, 18 decimals, mint-to-deployer, no mint/burn/ownable).
- `ArtemisLauncher.sol` — Immutable router, `launch(n, s, supply, pooled, ethMin, deadline) payable`. Requires `msg.value > 0`, `0 < pooled <= supply`, live deadline. Deploys token, exact-minimum liquidity via `addLiquidityETH` (LP to creator), sweeps remainder, emits `Launched`.
- No Hardhat/Foundry. Custom pipeline: `solc 0.8.26` + `scripts/compile-token.mjs` → generated `lib/*-artifact.ts` (never hand-edited). Deployed once via `scripts/deploy-launcher.mjs --mainnet`; verified with `scripts/gen-verify-input.mjs` (Blockscout standard-JSON).

### B. EVM execution layer (`lib/launcher-evm.ts`)

Pinned chain configs (`HOOD_MAINNET` / `HOOD_TESTNET`), `calcEthMin` slippage math with dust clamping, `chainDeadline` from block timestamp with local-clock fallback, `estimateLaunchCost` (1 vs 2 steps), `deployToken`, `addLiquidity` (approve → pool), `launchOneTx`, `decodeLaunchedToken` (Launched-event parsing filtered by launcher address), and `validateRouter` trust checks.

### C. Proof-gated showcase (`app/api/community/tokens/`, `lib/verify-tx.ts`, `lib/community-db.ts`)

Postgres tables `tokens` + `rate_limits` (migrations `0001→0003`). `verifyEvmTx` accepts creation proof or pool proof only; Solana path requires confirmed/finalized status with mint + creator in account keys. Display layer rewrites `ipfs.io` artwork through the Pinata gateway (rate-limit hardening) with hide-on-error.

### D. Studio frontend (`app/`, `components/`, `hooks/`)

Next.js App Router: `/` (11-section landing + studio), `/tokens` (showcase), `/api/{chat,community,pump-metadata,status}`. State is React Context only (`DraftContext`, `PageTransition`) plus localStorage receipts — no store library. Single custom hook (`useMotion`) for scroll reveals. One artwork pipeline feeds both rails: `LaunchForm` → `CropModal` (1:1) → EVM pin / Solana metadata.

### E. Abuse & quota rails (`lib/rate-limit.ts`, `app/api/pump-metadata/`)

Memory + Postgres rate limits, daily Pinata cap (200), 4 MB body cap before `JSON.parse`, https-only artwork URLs, 2 MB image cap, artwork-only pin mode for EVM showcase images.

---

## 5. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | Next.js 16.3.4 (App Router) + React 19 | Landing, studio, showcase, API routes |
| **Language** | TypeScript 5 (Strict Mode) | End-to-end type safety |
| **Styling & Motion** | Tailwind CSS v4 + custom CSS | Dark launchpad UI, page transitions |
| **Blockchain Client (EVM)** | viem 2.56.7 | Wallet, contracts, receipts, verification |
| **Blockchain Client (Solana)** | @solana/web3.js 1.99 | Pump.fun trade-local + devnet drill mint |
| **Contracts** | Solidity 0.8.26 (solc, optimizer 200 runs) | Token + atomic launcher, Blockscout-verified |
| **Database** | Postgres 3.4.9 (Supabase pooler) | Showcase tokens, durable rate limits |
| **AI Copilot** | OpenAI-compatible endpoint (Mimo v2.5 default) | Natural-language launch drafts |
| **Artwork Pinning** | Pinata (server-side JWT) | IPFS showcase + pump.fun metadata |
| **Testing** | Vitest 4.1.11 | 372 tests across 17 files |
| **DEX** | Uniswap V2 (Robinhood Chain router/factory/WETH) | Pool seeding target |

### Pinned Onchain Addresses (Robinhood Chain 4663)

| Role | Address |
|---|---|
| ArtemisLauncher (verified) | `0xeea9d0f7ee0958c6d59f25162be4e69ba60a0f71` |
| Uniswap V2 Router | `0x89e5db8b5aa49aa85ac63f691524311aeb649eba` |
| Uniswap V2 Factory | `0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f` |
| WETH | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` |
| ASIF Token (live proof) | `0x1b497f3577df58f5a15f062d3f8a22999b4e86cc` |
| ASIF/WETH Pool | `0xc682aefee57c0fbe890238f6f09d0066d450f834` |

---

## 6. Verification & Quality Assurance Summary

- **TypeScript Compilation:** Zero errors (`npx tsc --noEmit`).
- **Lint:** ESLint 0 errors (`npm run lint`).
- **Tests:** 372 passed / 17 files (`npm test`) — launch math, deadlines, receipt resume/dedupe guards, crop geometry, verify-tx proofs, route validation, rate limits.
- **Live Mainnet Proof:** 1-tx ASIF launch (token + pool + LP), re-verified onchain 2026-09-21 — see `docs/MAINNET-PROOF.md`.
- **Live Testnet Proof:** ARTS token-only rehearsal, re-verified onchain 2026-09-21 — see `docs/TESTNET-PROOF.md`.
- **Security & Privacy:** `.env.local` git-ignored; `PRIVATE_KEY` deploy-only and never committed; server never signs or custodies funds; showcase rejects unproven listings; Pinata JWT server-side only.
- **Production Deployment:** Live on Vercel (`artemis-olive.vercel.app`) with showcase backed by Postgres and local-receipt fallback when the DB is unreachable.
