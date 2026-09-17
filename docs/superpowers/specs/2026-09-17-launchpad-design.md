# Luce-Style Launchpad — Design Spec

Date: 2026-09-17. Status: approved by user. Concept clone of lucepad.com, Next.js stack, free Vercel deploy.

## 1. Goal

No-code web app to launch a coin plus trading pool via wallet signature. AI chat (Mimo v2.5) helps fill the draft. Focus on 2 rails: Hood Chain direct-pool plus Solana pump.fun. Non-custodial, never holds user funds.

## 2. v1 Non-Goals

No custom bonding curve, no cross-chain bridging, no presale/IDO, no custom liquidity locking, no atomic 1-tx launcher (needs own contract plus audit = phase 2), no mobile app, no automated e2e.

## 3. Architecture

Next 16 + React 19 + Tailwind (consistent with wealthypeople repos). App Router.

```
Browser
├── / → studio: AI chat + 3D character + launch form + review dialog
├── /tokens → showcase catalog
└── /api
    ├── /api/status → AI flag + network list
    ├── /api/chat → Mimo v2.5 proxy (server-only key)
    └── /api/community → showcase CRUD (Neon)
Execution happens in the user wallet (server never signs, never holds funds):
├── Hood 4663 → token + pool via V2 router
└── Solana → pump.fun tx via PumpPortal, signed with Phantom/Solflare
```

Free Vercel limit (~60s per function): all heavy tx runs in the browser. Server only does chat + catalog.

## 4. Components

1. Chat studio (client): composer with maxlength 1000, quick suggestions, AI status badge.
2. 3D character (client): three.js drag/arrow-key rotation, static PNG fallback.
3. Form + Review (client): required ticker, optional name defaulting to ticker, chain picker, liquidity, pool tokens. Review dialog plus real-funds consent checkbox for mainnets.
4. Wallet connector (client): EVM `eth_requestAccounts`, `eth_chainId` check, `wallet_switchEthereumChain` plus `wallet_addEthereumChain` fallback. Solana: Phantom/Solflare `connect` + `signTransaction`.
5. Hood launcher (client lib, viem/wagmi): honest 2-tx v1 — tx1 deploys fixed-supply 999M ERC20 (own template, no mint/tax), tx2 `addLiquidityETH` via router. Validate router first (`WETH()`, factory match, non-zero `getCode`). Wait for each receipt, store receipts in localStorage. Why 2-tx: a V2 router cannot deploy tokens; an atomic 1-tx launcher needs its own contract plus audit = phase 2, not v1.
6. pump.fun launcher (client lib, @solana/web3.js): build tx via PumpPortal, send, confirm, store receipt. Failed final step = resume button.
7. api/chat (server): system prompt pins output to draft JSON `{name, ticker, pooled, liquidity, route}`. No key = manual form mode.
8. api/community + Neon (server): `tokens(chain, address, creator, name, symbol, pool, tx_hash, profile, created_at)` table.
9. api/status (server): `{configured, model, networks[]}`.

## 5. Chain config (from onchain research)

| Chain | ID | Router/rail | Factory | RPC | Explorer |
|---|---|---|---|---|---|
| Hood | 4663 | `0x89e5db8b5aa49aa85ac63f691524311aeb649eba` (V2) | `0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f` | `https://robinhood-rpc.publicnode.com` (official endpoint blocked by local ISP) | blockscout + stonscan |
| Hood WETH | — | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` | — | — | — |
| Solana | mainnet | pump.fun via PumpPortal | — | `https://api.mainnet-beta.solana.com` | solscan |
| Test | Hood 46630, Solana devnet | Hood testnet: V2 deployment NOT verified yet — resolve during planning (find 46630 router/factory or deploy template + manual testnet pool). Solana devnet: no pump.fun on devnet → rehearse via devnet SPL + devnet Raydium if available, else mock review without broadcast. | respective testnets | testnet explorers |

Supply: direct 999,000,000 fixed, no mint. Onchain reference token: `$LUCE 0x0977...59ec4` (name LucePad, 18 decimals, 1B supply).

## 6. Data flow

Chat → draft JSON → form (manual edit allowed) → review + consent → connect wallet → sign → local receipt + showcase POST → render `/tokens`. AI offline at any point = form still works.

## 7. Error handling

- Reverted tx: show reason + warn gas is spent. Hood 2-tx: failed tx2 → token stays in wallet + resume add-liquidity button (like Solana). Stranded Solana token → resume.
- Dead RPC: message + suggest alternative endpoints (list in §5).
- Dead AI: offline badge, manual form.
- Validation: empty ticker / wrong-chain receipt = reject before signing.

## 8. Testing

- `vitest`: draft parser units, form validation, supply constants.
- Manual live runs: Hood testnet 46630 + Solana devnet first, then small mainnet.
- Release checklist: connect, chain switch, successful tx, stored receipt, showcase entry, Solana + Hood tx2 resume.

## 9. Env

`LLM_API_URL` (default Mimo OpenAI-compatible endpoint, helios2 pattern), `LLM_API_KEY` (Mimo, user supplies later), `LLM_MODEL=mimo-v2.5`, `DATABASE_URL` (Neon). Missing `LLM_*` = chat off by design, web still works.

## 10. Honest risks (shown on the web)

Staging, unaudited. Direct LP unlocked and withdrawable. No buyer/listing guarantees. Mainnet = real money. Testnet first.
