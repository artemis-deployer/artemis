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
| `PRIVATE_KEY` | Deploy-only key for `scripts/deploy-launcher.mjs` (local, never commit, never put in `.env.local` for dev server) |

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
| `node scripts/gen-verify-input.mjs` | Rebuild `blockscout-verify-input.json` (standard-JSON) from `contracts/` |
| `PRIVATE_KEY=0x... node scripts/deploy-launcher.mjs --mainnet` | Deploy `ArtemisLauncher` to Hood mainnet 4663 (local, one-time) |
| `psql "$DATABASE_URL" -f migrations/0001_init.sql` | Create the showcase table once |
| `psql "$DATABASE_URL" -f migrations/0002_rate_limits.sql` | Create the shared rate-limit table (required for durable throttling) |
| `psql "$DATABASE_URL" -f migrations/0003_showcase_image.sql` | Add artwork image column to showcase |

Fresh DB: run all three in order 0001→0002→0003 (sequential, all required).

## Launch rails

- **Hood Chain (4663):** 1 transaction via ArtemisLauncher — fixed-supply ERC20 deploy + Uniswap V2 pool funding atomically. Live and verified, see `docs/MAINNET-PROOF.md`. Testnet (46630) rehearses the deploy; the pool step is stubbed there because no V2 exists on testnet. See `docs/TESTNET-PROOF.md`.
- **Solana pump.fun:** metadata upload via `/api/pump-metadata` (`PINATA_JWT`) + trade-local build + wallet signature. Devnet broadcasts a real SPL drill-mint (valueless test tokens).

## Docs

- `docs/TESTNET-PROOF.md` — live testnet deployment record
- `docs/MAINNET-PROOF.md` — live mainnet 1-tx launch record
- `docs/superpowers/specs/2026-09-17-launchpad-design.md` — design spec
- `docs/superpowers/plans/` — implementation plans per rail
