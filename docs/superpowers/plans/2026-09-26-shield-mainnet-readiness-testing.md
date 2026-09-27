# Shield Mainnet Readiness Testing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete and record the Shielded Pool B6 checks that can be proven locally or on Robinhood testnet without requiring large faucet balances, while keeping all user-facing feature flags disabled.

**Architecture:** Keep protocol and relay checks in Vitest/integration harnesses, use Robinhood `eth_call` state overrides for stateful guards such as cap and deposit pause, and use the real testnet only for the already authorized 0.001 ETH deposit-to-withdraw lifecycle. Keep persistent encrypted note backups outside the build tree and reconcile on-chain events against pool balance after each live run.

**Tech Stack:** Solidity 0.8.28; pinned 0xbow Privacy Pools Core v1.2.1; Next.js API routes; viem; Vitest; published Groth16 circuits and verifier artifacts.

**Spec:** `docs/superpowers/specs/2026-09-26-shielded-pool-integration-design.md`; activation gates in `docs/next/DevBrief-Activation.md`.

## Global Constraints

- Robinhood testnet chain ID is 46630; no mainnet transaction or deployment is included.
- Keep all `SHIELD_*` activation and readiness flags false.
- Do not send a 10 ETH deposit or any transaction intended to fill the pool cap.
- Do not irreversibly pause deposits on the active testnet pool.
- Never replace or automatically delete an encrypted note backup.
- Record mobile, second-device, and legal checks as waived by owner; do not list them as blockers.
- Report contract-level fuzz and any unperformed visual/browser checks as incomplete until directly evidenced.

---

### Task 1: Map B6 to reproducible checks

**Files:**
- Modify: `docs/next/DevBrief-Activation.md`
- Modify: `deployments/robinhood-testnet-privacy-pools-v1.2.1-0.001eth.json`
- Review: `tests/shield-live-testnet-rehearsal.test.ts`

- [x] Record each B6 scenario as passed, partial, or pending, with the exact command or transaction evidence.
- [x] Separate stale association-root rejection from the stale Merkle-root case.
- [x] Distinguish SDK event recovery from a new browser/device recovery test.
- [x] Run a read-only on-chain event/balance reconciliation and preserve the pre-existing 0.001 ETH residual note status.

### Task 2: Prove invalid Merkle roots and excluded ASP labels are rejected

**Files:**
- Modify: `tests/shield-live-testnet-rehearsal.test.ts`
- Modify: `tests/shielded-association.test.ts`

- [x] Add a failing test that changes only the state-root public signal and confirms relay rejection before broadcast.
- [x] Confirm the existing membership-proof builder rejects an absent association label before proof generation.
- [x] Run the focused tests to observe the expected failures.
- [x] Implement the smallest reusable validation path and confirm both rejection cases without an on-chain write.

### Task 3: Verify deposit pause behavior without pausing the active pool

**Files:**
- Modify: `scripts/shield/simulate-deposit-cap.mjs` or create `scripts/shield/simulate-pool-pause.mjs`
- Create/modify: `tests/shield-pool-state-override.test.ts`
- Modify: `docs/next/DevBrief-Activation.md`

- [x] Derive and verify the `depositsPaused` storage slot/offset from the pinned Solidity 0.8.28 storage layout.
- [x] Use an ephemeral `eth_call` override to prove deposit reverts with the pause error.
- [x] Using a fresh valid unspent proof only within the authorized E2E sequence, simulate withdrawal while the pause flag is overridden true and prove it succeeds without consuming the note.
- [x] Verify on-chain storage and pool balance are unchanged after both calls.
- [x] Do not call the live guardian pause function on the active pool.

### Task 4: Verify lost-note warning and fresh-browser recovery

**Files:**
- Review/modify: `components/ShieldPanel.tsx`
- Review/modify: `components/ShieldNoteBackup.tsx`
- Modify: `tests/shield-live-testnet-rehearsal.test.ts`
- Modify: `docs/next/DevBrief-Activation.md`

- [x] Source review confirms recovery warning acknowledgement is required before deposit initiation; visual browser confirmation was waived by owner.
- [x] Verify a persistent encrypted backup can restore the phrase after a fresh process/session and rebuild the note from confirmed events.
- [x] Do not expose the recovery phrase or private key in logs, screenshots, or test output.
- [x] Record second browser/device test as waived by owner; SDK recovery and event-tree rebuild were verified independently.

### Task 5: Validate mobile proving and relayer front-run resistance

**Files:**
- Review: `components/ShieldPanel.tsx`
- Modify: `tests/shield-live-testnet-rehearsal.test.ts`
- Modify: `docs/next/DevBrief-Activation.md`

- [x] Mobile proving measurement waived by owner; mobile support is outside this activation scope.
- [x] Test that a proof bound to one recipient cannot be redirected by a different relayer recipient.
- [x] Record recipient substitution rejection as diversion-resistance evidence; no controlled mempool front-run was performed or claimed.

### Task 6: Strengthen the deposit/withdraw invariant check

**Files:**
- Modify: `tests/shield-live-testnet-rehearsal.test.ts`
- Create/modify: `tests/shield-pool-invariant.test.ts`
- Modify: `docs/next/DevBrief-Activation.md`

- [x] Keep the full event-total versus pool-balance check.
- [x] Add deterministic randomized sequences for deposit, withdrawal, and failed-operation cases against the state model.
- [x] Verify failures do not change modeled pool balance or nullifier state.
- [x] Label model fuzz separately from on-chain invariant evidence.

### Task 7: Final gates and evidence

**Files:**
- Modify: `docs/next/DevBrief-Activation.md`
- Modify: `docs/next/Implementation-Status.md`
- Modify: `docs/next/Shielded-Pool-Operations.md`
- Modify: active deployment manifest

- [x] Run the full Vitest suite, TypeScript check, production build, artifact integrity check, and `git diff --check`.
- [x] Verify all Shield feature flags remain false and no temporary test server is listening.
- [x] Update statuses from observed results; record owner-waived legal/mobile/second-device checks and keep contract-level fuzz and internal technical review explicit.
- [x] Do not deploy or enable Shield on mainnet as part of this plan.
