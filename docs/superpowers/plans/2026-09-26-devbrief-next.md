# DevBrief-Next Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all three `docs/next/` briefs: ZK activation gaps (A), Shielded Pools v1 testnet-ready (B), deployment manifest + /contracts page (Deployments).

**Architecture:** Server-side ZK flags gate all `/api/zk/*` routes; fixed-denomination ShieldedPool.sol with external verifier interface + mock for testnet; TS Merkle reference in lib; deployments JSON as single source for /contracts page and X post generator.

**Tech Stack:** Next.js 16 App Router, viem, solc 0.8.26 (optimizer 200 runs), postgres, vitest, Reclaim JS SDK 5.8.2.

## Global Constraints

- Commit messages in English only, never Indonesian.
- Codebase language English (code, comments, docs); chat Indonesian.
- No cosmetic ZK claims: ZK UI renders only when enabled AND verified in production.
- APP_SECRET server-side only, never in client bundle.
- Banned words: "rug-proof", "fully trustless", "untraceable", "anonymous launch", "mixer", "tumbler", "launder", "regulator-proof", "audited" (without report), "guaranteed".
- Allowed: "ZK-verified creator", "zkTLS proof", "shielded pool", "private by choice", "provably clean".
- Honest staging: testnet → allowlist mainnet → public mainnet; shielded mainnet BLOCKED until audit + ceremony + legal review.
- AMENDMENT 2026-09-26 (owner): third-party audit WAIVED for Shielded Pools. Substituted with recorded
  internal review + full test suite + testnet rehearsal + strict onchain caps. Mock verifier stays
  testnet-only; mainnet with the mock has no privacy and must stay labeled rehearsal-grade.

---

### Task A: ZK server-side feature flags

**Files:**
- Create: `lib/zk-flags.ts`
- Modify: `app/api/zk/nonce/route.ts`, `app/api/zk/init/route.ts`, `app/api/zk/callback/route.ts`, `app/api/zk/status/route.ts`, `app/api/zk/reverify/route.ts`, `app/api/zk/token/[chainId]/[address]/route.ts`, `app/api/zk/proof/[id]/route.ts`
- Modify: `.env.example`
- Test: `tests/zk-flags.test.ts`

**Interfaces:**
- Consumes: `process.env` (`ZK_VERIFY_ENABLED`, `ZK_VERIFY_UI_ENABLED`, `ZK_BADGE_PUBLIC`, `ZK_VERIFY_ALLOWLIST`, `ZK_LANDING_SECTION`)
- Produces: `zkFlags() -> { enabled, uiEnabled, badgePublic, landingSection, allowlist: string[] }`, `isWalletAllowed(flags, wallet) -> boolean`

- [ ] **Step 1: Write the failing test** (`tests/zk-flags.test.ts`): defaults all false/empty; `ZK_VERIFY_ENABLED=1` flips enabled; allowlist parses comma wallets lowercase; isWalletAllowed false when allowlist non-empty and wallet absent.
- [ ] **Step 2: Run test to verify it fails** — Run: `npx vitest run tests/zk-flags.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Write minimal implementation** (`lib/zk-flags.ts`): read env, `=== "1"` / `"true"` accepted; allowlist split on comma, trim, lowercase, filter empty.
- [ ] **Step 4: Gate routes**: in each of the 7 zk routes, first line `if (!zkFlags().enabled) return 503 { error: "zk_disabled" }`. In init route, after wallet parse: `if (!isWalletAllowed(flags, wallet)) return 403 { error: "allowlist_only" }`.
- [ ] **Step 5: Update `.env.example`** with the 5 flags (default empty/0) + `ZK_METRICS_TOKEN=` (Task C).
- [ ] **Step 6: Run tests** — Run: `npx vitest run tests/zk-flags.test.ts tests/zk-routes.test.ts`. Expected: PASS (existing tests must stub `ZK_VERIFY_ENABLED=1` in beforeEach).

### Task B: ZK negative-scenario tests (brief A4)

**Files:**
- Modify: `tests/zk-routes.test.ts`

**Interfaces:**
- Consumes: mocked `../lib/zk-db`, mocked `@reclaimprotocol/js-sdk`, route handlers.
- Produces: 8 new `it()` cases, no new exports.

- [ ] **Step 1: Add failing tests**: stale_proof (timestamp 1h old → 400 stale_proof), nonce_mismatch (context nonce n2 vs session n1 → 400), invalid_proof on TEE fail (`isTeeAttestationVerified: false` → 400), replay double-submit (`saveVerification` rejects → 400 unknown_or_used_session, no store), init rate_limited (stub checkRateLimit? routes import real rate-limit — instead test init allowlist_only 403 via ZK_VERIFY_ALLOWLIST set without wallet), reverify valid (`{valid:true}`) + revoked, proof 404 already exists (skip).
- [ ] **Step 2: Run** — Run: `npx vitest run tests/zk-routes.test.ts`. Expected: new cases FAIL only if implementation missing; most should PASS immediately (implementation exists) — allowlist_only needs Task A.
- [ ] **Step 3: Fix fallout**: ensure `beforeEach` stubs `ZK_VERIFY_ENABLED=1` so old tests pass with Task A gates.

### Task C: ZK metrics endpoint (brief A7)

**Files:**
- Modify: `lib/zk-db.ts` (add `getZkMetrics()`)
- Create: `app/api/zk/metrics/route.ts`
- Test: extend `tests/zk-routes.test.ts` (mock getZkMetrics; 401 without token, 200 with token)

**Interfaces:**
- Consumes: `ZK_METRICS_TOKEN` env; `lib/zk-db.getZkMetrics()`.
- Produces: `GET /api/zk/metrics?token=... -> { sessions: {pending,verified,failed,expired}, failures: {reason: count} }` — counts only, no personal data.

- [ ] **Step 1: Failing test** for 401 + 200 shape.
- [ ] **Step 2: Implement** `getZkMetrics()` with two GROUP BY queries; route compares `?token=` (or Authorization Bearer) to env with timing-safe compare (simple `===` acceptable, note it).
- [ ] **Step 3: Run tests**, expect PASS.

### Task D: ShieldedPool.sol + verifier interface + compile pipeline

**Files:**
- Create: `contracts/ShieldedPool.sol`, `contracts/ShieldedVerifierMock.sol`
- Create: `scripts/compile-shielded.mjs`
- Generated: `lib/shielded-artifact.ts` (via script, never hand-edited)
- Test: `tests/shielded-artifact.test.ts` (pin ABI fns/events, optimizer note)

**Interfaces:**
- Consumes: solc 0.8.26, same standard-JSON pattern as `scripts/compile-token.mjs`.
- Produces: `SHIELDED_ABI`, `SHIELDED_BYTECODE`, `SHIELDED_MOCK_ABI`, `SHIELDED_MOCK_BYTECODE`.

Contract spec (fixed denomination, testnet-first):
- Constructor `(verifier, denomination, maxDepositPerTx==denomination, poolCap, associationRoot, guardian)`.
- `deposit(commitment bytes32)` payable `msg.value == denomination`, cap checks, appends to Merkle tree depth 20, emits `Deposit(index, commitment)`.
- `withdraw(proof bytes, root, nullifierHash, recipient, fee)` calls `verifier.verify(...)`, checks root known (last 100 roots), nullifier unused, association root match, sends `denomination - fee` to recipient and fee to `msg.sender` (relayer), emits `Withdraw(nullifierHash, recipient)`.
- `pauseDeposits()` / `unpauseDeposits()` guardian-only; withdraw never pausable. `renounceGuardian()`.
- Mock verifier: `verify(...) returns true` IFF `proof[0] != 0x00` (clearly labeled TESTNET ONLY in comments + revert string docs).

- [ ] **Step 1: Write contract test first** (`tests/shielded-artifact.test.ts`): assert ABI contains deposit/withdraw/pauseDeposits/renounceGuardian events Deposit/Withdraw; mock ABI contains verify.
- [ ] **Step 2: Run** — FAIL (files missing).
- [ ] **Step 3: Write contracts + compile script**, run `node scripts/compile-shielded.mjs`.
- [ ] **Step 4: Run test** — PASS. Also run `node scripts/compile-token.mjs` untouched to confirm no regression.

### Task E: Shielded client library + tests (brief B6 unit/invariant)

**Files:**
- Create: `lib/shielded.ts`
- Test: `tests/shielded.test.ts`

**Interfaces:**
- Consumes: `viem keccak256` for `commitment = keccak256(nullifier, secret)`, `nullifierHash = keccak256(nullifier)`.
- Produces: `makeNote()`, `commitmentOf(note)`, `nullifierHashOf(note)`, `MerkleTree` (append, root, proof, verify), `DENOMINATIONS = [0.01, 0.1, 1.0] ETH`, `SHIELD_CAPS`.

- [ ] **Step 1: Failing tests**: note uniqueness; tree root matches manual keccak chain for 2 leaves; proof verifies; tampered leaf fails; double-nullifier detected via Set; rebuild from Deposit events reproduces root.
- [ ] **Step 2: Implement** minimal keccak Merkle (depth 20, zero hashes precomputed).
- [ ] **Step 3: Run** — PASS.

### Task F: Shield UI behind flags (brief B5)

**Files:**
- Create: `components/ShieldPanel.tsx`
- Modify: `app/page.tsx` (render behind `SHIELD_ENABLED`), `.env.example` (6 SHIELD_* flags)

**Interfaces:**
- Consumes: `process.env.NEXT_PUBLIC_SHIELD_ENABLED === "1"`, `lib/shielded.ts` denominations/caps.
- Produces: `<ShieldPanel />` with denomination select, backup-note warning (B6 #7: note loss = funds lost), deposit/withdraw buttons disabled with "testnet only" copy until B-1 passes. No real tx wiring in v1 (explicitly labeled rehearsal UI).

- [ ] **Step 1: Implement component + wiring + env docs.**
- [ ] **Step 2: Typecheck** (`npx tsc --noEmit`), **lint** changed files.

### Task G: Deployments manifest + post generator + /contracts page (Deployments brief)

**Files:**
- Create: `deployments/robinhood-mainnet.json`, `deployments/robinhood-testnet.json`
- Create: `scripts/make-post.mjs`
- Generated: `deployments/robinhood-mainnet.post.md`, `deployments/robinhood-testnet.post.md`
- Create: `app/contracts/page.tsx`
- Modify: `components/Footer.tsx` ({PROTOCOL} add Contracts link)

**Interfaces:**
- Consumes: manifest JSON shape from brief §3 (project, network, chainId, explorer, deployBlock, deployedAt, deployer, gitCommit, contracts[], external[]).
- Produces: post markdown per template §6; /contracts page reading manifest via import, tabs Mainnet|Testnet, copy buttons, VERIFIED badges, External labels.

Mainnet manifest content (verified facts): launcher 0xeea9…0f71 (tx 0x4fa8…bf235, verified true, owner none), ASIF token + pool as reference entries? Brief: only Artemis contracts + external. ASIF is a user token, NOT Artemis contract → exclude from contracts[], mention pool nowhere. External: router 0x89e5…eba, factory 0x8bce…37f, WETH 0x0Bd7…73. Testnet manifest: contracts [] with note "no Artemis contracts on testnet; rehearsal uses token-only drill", external [] (no V2 on testnet).

- [ ] **Step 1: Write JSONs + generator + run** `node scripts/make-post.mjs` → post.md files.
- [ ] **Step 2: Build /contracts page + footer link.**
- [ ] **Step 3: Typecheck + lint.**

### Task H: Full verification (verification-before-completion skill)

- [ ] Run `npx tsc --noEmit` → zero errors.
- [ ] Run `npm run lint` → zero errors.
- [ ] Run `npm test` → all pass; record new totals.
- [ ] Grep client bundle risk: `RECLAIM_APP_SECRET` must not appear in `components/` or `app/` client code (only route.ts + lib server). Confirm via grep.
- [ ] Report: what went live-ready vs what remains blocked (audit, ceremony, legal, Reclaim prod creds, DB migration, flags).
