# Artemis — launch your coin

Chat an idea into a token draft, then launch it from your own wallet. Non-custodial: the server never signs and never holds funds.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill LLM_API_KEY + DATABASE_URL
npm run dev                  # http://localhost:3000
```

## Env

| Var | Purpose |
|---|---|
| `LLM_API_URL` | OpenAI-compatible chat endpoint (Mimo default in `.env.example`) |
| `LLM_API_KEY` | Server-only model key. Missing = chat-off mode, forms still work |
| `LLM_MODEL` | Default `mimo-v2.5` |
| `DATABASE_URL` | Supabase Postgres (pooler). Missing = showcase falls back to local receipts |
| `PINATA_JWT` | Pinata JWT for pump.fun metadata pinning (server-only). Missing = Solana metadata upload fails; devnet rehearsal still builds |

## Env security

- `.env.local` holds live keys and is git-ignored. If a key ever leaks, rotate it
  in the Mimo / Supabase dashboard and restrict the Postgres role to least privilege.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (runs tsc) |
| `npm test` | Vitest suite |
| `npm run lint` | ESLint, 0 errors required |
| `node scripts/compile-token.mjs` | Rebuild `lib/token-artifact.ts` + `lib/launcher-artifact.ts` from `contracts/` |
| `psql "$DATABASE_URL" -f migrations/0001_init.sql` | Create the showcase table once |

## Launch rails

- **Hood Chain (4663):** 1 transaction via ArtemisLauncher — fixed-supply ERC20 deploy + Uniswap V2 pool funding atomically (falls back to the legacy 2-step flow until the launcher address is configured). Testnet (46630) rehearses the deploy; the pool step is stubbed there because no V2 exists on testnet. See `docs/TESTNET-PROOF.md`.
- **Solana pump.fun:** metadata upload + trade-local build + wallet signature. Devnet builds the transaction bytes but refuses broadcast by design.

## Docs

- `docs/TESTNET-PROOF.md` — live testnet deployment record
- `docs/superpowers/specs/2026-09-17-launchpad-design.md` — design spec
- `docs/superpowers/plans/` — implementation plans per rail
