<div align="center">

![Artemis Banner](./assets/artemis-banner.png)

# ARTEMIS

**Autonomous Non-Custodial Token Launchpad & AI Copilot for Robinhood Chain & Solana**

🌐 **Web Application:** [https://artemis-olive.vercel.app](https://artemis-olive.vercel.app) · 📜 **Documentation:** [docs/MAINNET-PROOF.md](docs/MAINNET-PROOF.md) · ⚡ **Testnet Proof:** [docs/TESTNET-PROOF.md](docs/TESTNET-PROOF.md)

*Chat an idea into a token draft. Deploy fixed-supply ERC20 & SPL coins into onchain AMM pools directly from your own wallet. 100% non-custodial, zero platform fees.*

[![Chains](https://img.shields.io/badge/Chains-Robinhood%20Chain%204663%20·%20Solana-CCFF00?style=flat-square&labelColor=0A081E&logoColor=black)](#-launch-rails)
[![Runtime](https://img.shields.io/badge/Runtime-Next.js%2016%20·%20React%2019%20·%20TypeScript-7C3AED?style=flat-square&labelColor=0A081E)](#-tech-stack)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4%20·%20Three.js%203D-38BDF8?style=flat-square&labelColor=0A081E)](#-platform-interfaces)
[![Launch](https://img.shields.io/badge/Launch-1--Tx%20Atomic%20Deploy%20+%20Pool-10B981?style=flat-square&labelColor=0A081E)](#-launch-flow-architecture)
[![Verification](https://img.shields.io/badge/Verification-Blockscout%20Standard--JSON%20Verified-FF7A29?style=flat-square&labelColor=0A081E)](#-smart-contracts--verification)
[![Tests](https://img.shields.io/badge/Tests-Vitest%20·%20370%2B%20Passing-10B981?style=flat-square&labelColor=0A081E)](#-testing--verification)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square&labelColor=0A081E)](#-license)

</div>

---

## ⚡ Overview

**Artemis** is an autonomous, non-custodial token launchpad and creative copilot. Describe your coin concept in plain language to the integrated AI Copilot, watch the parameters generate in real-time, inspect a complete financial breakdown, and launch atomically with a single wallet signature.

In conventional launchpads, users face severe custody hazards: platforms hold private keys, front-run initial liquidity, take hidden percentage fees, or leave creators stranded with un-paired tokens. 

Artemis eliminates this by architecture:
- **Zero Custody:** The server never signs transactions and never holds creator funds.
- **1-Transaction Atomicity:** Contract deployment and Uniswap V2 AMM pool funding execute in one atomic transaction via `ArtemisLauncher`. Either everything succeeds or everything safely reverts.
- **Cryptographic Verification:** Every community listing requires verified on-chain transaction proofs directly from Blockscout or Solana RPCs, preventing forgeries or spoofed launches.

---

## 🏛️ Core Value Proposition

* **AI Copilot Drafting:** Co-create token parameters (name, ticker, supply, description, AMM liquidity) via OpenAI-compatible natural language streaming with conversation memory, instant parameter auto-apply, and one-click undo.
* **1-Transaction Atomic EVM Launch:** Deploys a fixed-supply ERC20 and pairs it into Uniswap V2 liquidity in a single atomic call. Zero risk of front-running or partial liquidity abandonment.
* **Multi-Rail Flexibility:** First-class support for **Robinhood Chain (Mainnet 4663 & Testnet 46630)** and **Solana (pump.fun bonding curve + Pinata IPFS metadata)**.
* **On-Chain Verified Showcase:** Transparent community catalog. Every token card requires real on-chain transaction verification; forged submissions are rejected with `400 invalid_tx`.
* **Zero Platform Fees & Clean Tokenomics:** Fixed supply (default 999M), zero creator taxes, no owner mint or freeze backdoor permissions. 100% of leftover tokens and LP ownership return directly to the creator.
* **Dry-Run & Rehearsal Rails:** Built-in support for Robinhood Testnet and Solana Devnet drill-mints so creators can rehearse the end-to-end flow with zero financial risk before going live.

---

## 🔬 Launch Flow Architecture

```mermaid
flowchart LR
    User([Creator Idea]) --> Copilot[1. AI Copilot / Manual Studio]
    Copilot --> Draft[2. Structured Launch Draft]
    Draft --> Review[3. Pre-Flight Review & Simulation]
    Review --> Wallet{4. Client Wallet Signature}
    
    Wallet -->|Robinhood Chain 4663| EVM[ArtemisLauncher.sol]
    Wallet -->|Solana SPL| SOL[Pump.fun Trade Program]
    
    EVM --> Atom[Atomic Deploy + Uniswap V2 Pool]
    SOL --> Pump[Bonding Curve + Pinata IPFS Metadata]
    
    Atom --> Proof[5. Onchain Verification]
    Pump --> Proof
    
    Proof --> Showcase[(Verifiable Community Showcase)]
```

### End-to-End Pipeline Stages

1. **Stage 1 — Intent Synthesis & Parameter Extraction:**
   - AI Copilot decomposes natural language concepts into cryptographically sound ERC20 / SPL specifications.
   - Extracts `name`, `symbol` (uppercase ticker), `supply`, `initialBuy`, and initial liquidity pairs.
2. **Stage 2 — Pre-Flight Simulation & Live Cost Estimation:**
   - Real-time RPC gas price queries and liquidity requirement calculations.
   - User-configurable slippage protection (0.5% to 5.0%) and strict 10-minute transaction execution deadlines.
3. **Stage 3 — Non-Custodial Client Signing:**
   - Transaction encoded entirely client-side using **Viem** (EVM) or **@solana/web3.js** (Solana).
   - Direct signature prompt in user's Web3 wallet (MetaMask, Rabby, Phantom, Coinbase Wallet).
4. **Stage 4 — Atomic Execution:**
   - **EVM (Robinhood Chain):** Calls `ArtemisLauncher.launch(...)`. Computes exact pair address, mints supply, deploys ERC20 bytecode, transfers base tokens, and deposits native gas tokens into Uniswap V2 liquidity pool atomically.
   - **Solana:** Uploads immutable metadata to IPFS via Pinata, builds local pump.fun bonding curve instruction, and executes on-chain.
5. **Stage 5 — On-Chain Proof & Showcase Ingestion:**
   - Local browser receipt persisted immediately in `localStorage` for zero UX delay.
   - Server queries Blockscout/Solana RPC to verify contract creation, deployer binding, and transaction hash before promoting to the global public showcase.

---

## 🖥️ Platform Interfaces

### 1. Interactive Launch Studio (`components/StudioSection.tsx`)
- **Dual Creation Mode:** Seamlessly switch between AI Copilot guidance and manual parameter tuning.
- **Three.js 3D Viewport:** Interactive dynamic 3D blocky grid canvas responding to cursor movements.
- **Reactive Draft Context:** Live synchronization between chat suggestions and the launch form with automatic error boundary guards.

### 2. Pre-Flight Review Dialog (`components/ReviewDialog.tsx`)
- **Transparent Cost Ledger:** Clear itemization of token creation gas, AMM liquidity funding, and estimated network fees.
- **Slippage & Deadline Controls:** Adjustable slippage tolerance to protect against volatile network conditions.
- **Live Readiness Checks:** Instant verification of wallet connection, chain matching, and sufficient balance.

### 3. Community Token Showcase (`app/tokens/page.tsx`)
- **Multi-Chain Catalog:** Filterable showcase separating Robinhood Chain and Solana deployments.
- **Instant Search:** Real-time filter across token names, tickers, contract addresses, and transaction hashes.
- **Local Receipt Fallback:** Creators can inspect their local receipts even during database maintenance or network partitions.
- **Direct Explorer Links:** One-click navigation to verified contracts on Blockscout and Solana explorers.

---

## ⛓️ Multi-Chain Launch Rails

| Network | Chain ID | Mechanism | Explorer & Proofs | Status |
|---|---|---|---|---|
| **Robinhood Chain** | `4663` (Mainnet) | `ArtemisLauncher` → Fixed-Supply ERC20 + Uniswap V2 Atomic Pool | [Blockscout Explorer](https://explorer.mainnet.chain.robinhood.com) · [MAINNET-PROOF.md](docs/MAINNET-PROOF.md) | 🟢 Live & Verified |
| **Robinhood Testnet** | `46630` (Testnet) | Rehearsal Deploy (Token deployment validated, pool stubbed) | [Blockscout Testnet](https://explorer.testnet.chain.robinhood.com) · [TESTNET-PROOF.md](docs/TESTNET-PROOF.md) | 🟢 Live Rehearsal |
| **Solana Mainnet** | `solana-mainnet` | Pump.fun bonding curve + Pinata IPFS metadata | [Solscan](https://solscan.io) | 🟡 Code-Ready |
| **Solana Devnet** | `solana-devnet` | Drill-mint rehearsal for SPL parameters | [Solana Explorer](https://explorer.solana.com/?cluster=devnet) | 🟢 Live Rehearsal |

---

## 📁 Repository Structure

```text
artemis/
├── app/                         # Next.js 16 App Router pages & API routes
│   ├── api/chat/                # AI Copilot endpoint (Mimo / OpenAI-compatible, rate-limited)
│   ├── api/community/tokens/    # Public showcase API with cryptographic tx-proof verification
│   ├── api/pump-metadata/       # Server-side Pinata IPFS pinning (keys protected server-side)
│   ├── tokens/                  # Community showcase & catalog page
│   ├── globals.css              # Obsidian & Ivory design system, Tailwind CSS v4 tokens
│   ├── layout.tsx               # Root layout, font definitions, and favicon metadata
│   └── page.tsx                 # Landing page & Launch Studio experience
│
├── components/                  # Modular React 19 UI Components
│   ├── StudioChat.tsx           # AI Copilot chat interface with markdown & code syntax
│   ├── LaunchForm.tsx           # Token parameters form (name, symbol, supply, liquidity)
│   ├── ReviewDialog.tsx         # Pre-flight transaction review & wallet dispatch
│   ├── SuccessModal.tsx         # Post-launch confirmation & celebration modal
│   ├── BlockyGridCanvas.tsx     # Three.js 3D interactive background canvas
│   ├── ArrivalPreloader.tsx     # Editorial splash preloader animation
│   └── TopbarWallet.tsx         # Multi-wallet connection button (EVM + Solana)
│
├── contracts/                   # Solidity Smart Contracts (solc 0.8.26)
│   ├── ArtemisToken.sol         # Clean fixed-supply ERC20 with burn & zero fees
│   └── ArtemisLauncher.sol      # 1-tx atomic deployer and Uniswap V2 liquidity router
│
├── lib/                         # Core Web3 & Utility Library
│   ├── launcher-evm.ts          # Viem client factory, bytecode execution & gas estimation
│   ├── launcher-solana.ts       # Solana web3.js transaction builder & pump.fun bindings
│   ├── verify-tx.ts             # On-chain transaction proof verification (Blockscout RPC)
│   ├── community-db.ts          # Postgres pooler schema & normalized row models
│   ├── chains.ts                # Multi-chain definitions, RPC endpoints & explorers
│   └── receipts.ts              # Local storage receipt ledger & reconciliation
│
├── scripts/                     # Operational & Build Tooling
│   ├── compile-token.mjs        # Compiles Solidity contracts to TypeScript artifacts
│   ├── deploy-launcher.mjs      # Deploy script for ArtemisLauncher contract
│   └── gen-verify-input.mjs     # Generates standard-JSON input for Blockscout verification
│
├── migrations/                  # Sequential PostgreSQL Migrations
│   ├── 0001_init.sql            # Base showcase tokens schema
│   ├── 0002_rate_limits.sql     # Sliding-window rate limit state
│   ├── 0003_showcase_image.sql  # Token avatar / metadata URL support
│   ├── 0004_showcase_story.sql  # Tagline / description / lore catalog fields
│   ├── 0005_showcase_hook.sql   # Marketing hook catalog field
│   └── 0006_showcase_links.sql  # X + website link fields
│
├── public/assets/               # Branded visuals, logos, and WebP assets
│   ├── artemis-banner.png       # High-resolution cosmic hero banner
│   ├── logo.webp                # Primary wide brand logo ([A] RTEMIS)
│   └── icon.png                 # Square transparent emblem favicon
│
└── docs/                        # Architectural Specs & Verification Proofs
    ├── MAINNET-PROOF.md         # Live Hood mainnet deployment and Uniswap V2 proof
    └── TESTNET-PROOF.md         # Testnet deployment verification record
```

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16.3 (Turbopack, App Router) + React 19 + TypeScript (Strict)
- **Styling:** Tailwind CSS v4 + Custom Design Tokens (`globals.css`)
- **3D Graphics:** Three.js (`three`, `@types/three`)
- **Web3 EVM:** Viem 2.x (Optimized for Robinhood Chain 4663)
- **Web3 Solana:** `@solana/web3.js` + `bs58`
- **Smart Contracts:** Solidity `0.8.26` compiled via native `solc`
- **Database:** PostgreSQL (Supabase pooler) + postgres.js
- **Testing:** Vitest 4.x (370+ unit and integration tests)

---

## 🚀 Quickstart & Local Development

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **PostgreSQL**: Local instance or [Supabase](https://supabase.com) project

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/artemis-deployer/artemis.git
cd artemis
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Populate the required keys in `.env.local`:

```env
# AI Copilot (OpenAI-compatible endpoint, Mimo default)
LLM_API_URL="https://api.mimo.ai/v1"
LLM_API_KEY="your-server-llm-key"
LLM_MODEL="mimo-v2.5"

# Database (Supabase PostgreSQL pooler connection)
DATABASE_URL="postgresql://postgres:password@db.yourproject.supabase.co:6543/postgres?pgbouncer=true"

# Solana pump.fun IPFS Pinning (Server-only)
PINATA_JWT="your-pinata-jwt-token"

# AI Logo Generation (Server-only, Google AI Studio key; empty = Pollinations fallback)
GOOGLE_API_KEY=""
GOOGLE_IMAGE_MODEL="gemini-2.5-flash-image"

# Contract Deployment (Local CLI only — NEVER commit or put in server environment)
# PRIVATE_KEY="0x..."
```

### 3. Compile Smart Contracts & Artifacts

Compile Solidity source files into TypeScript bytecodes and generate the Blockscout standard verification payload:

```bash
node scripts/compile-token.mjs
node scripts/gen-verify-input.mjs
```

### 4. Database Migrations

Apply database schemas in sequential order:

```bash
psql "$DATABASE_URL" -f migrations/0001_init.sql
psql "$DATABASE_URL" -f migrations/0002_rate_limits.sql
psql "$DATABASE_URL" -f migrations/0003_showcase_image.sql
psql "$DATABASE_URL" -f migrations/0004_showcase_story.sql
psql "$DATABASE_URL" -f migrations/0005_showcase_hook.sql
psql "$DATABASE_URL" -f migrations/0006_showcase_links.sql
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Smart Contracts & Verification

Artemis uses audited, immutable Solidity contracts designed for total non-custodial safety:

* **`ArtemisToken.sol`:** Standard ERC20 with fixed supply minted entirely during construction. Features zero fee on transfer, optional burn functionality, and no owner control.
* **`ArtemisLauncher.sol`:** Atomically deploys the token, creates the Uniswap V2 pair with native Robinhood gas currency, transfers the designated token liquidity, calls `addLiquidityETH`, and refunds any remaining dust to `msg.sender`.

### Contract Verification

Pre-generated standard-JSON verification input is available at [`blockscout-verify-input.json`](blockscout-verify-input.json). To verify manually on Blockscout:
1. Select **Standard-JSON Input** compiler mode.
2. Set compiler version to `v0.8.26+commit.8a97fa7a`.
3. Enable 200 optimization runs.
4. Upload `blockscout-verify-input.json`.

Verified mainnet records and contract addresses are cataloged in [`docs/MAINNET-PROOF.md`](docs/MAINNET-PROOF.md).

---

## 🧪 Testing & Verification

Artemis maintains rigorous automated test coverage across cryptographic signatures, blockchain adapters, and rate limiting:

```bash
# Run full Vitest test suite
npm test

# Strict TypeScript typechecking
npx tsc --noEmit

# ESLint audit (0 errors required)
npm run lint

# Production compilation
npm run build
```

---

## 🛡️ Non-Custodial Security & Risk Disclosures

* **Zero Server-Side Custody:** Artemis never requests, stores, or transmits private keys. Every transaction is constructed client-side and requires explicit authorization in your personal wallet.
* **Cryptographic Verification:** All community showcase entries are checked against real on-chain transaction receipts before listing.
* **Immutable Economics:** Launched tokens have fixed supplies with no minting or freeze backdoors.
* **Disclaimer:** Tokens launched through Artemis are created autonomously by decentralized users. Digital assets involve significant financial risk. Nothing in this repository constitutes financial, investment, or legal advice. Always conduct independent research.

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
