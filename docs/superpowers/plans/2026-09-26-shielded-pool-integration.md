# Shielded Pool Integration Plan

> **For agentic workers:** Execute in order and verify each deliverable before advancing.

**Goal:** Deliver an integrated Robinhood testnet native ETH privacy-pool rehearsal based on one pinned 0xbow release, with real proof verification, recoverable notes, association-set data, and a relayer.

**Architecture:** Pin upstream 0xbow v1.2.1 and reuse its Groth16/Poseidon/LeanIMT formats, verifier artifacts, and SDK. Patch the native pool boundary for Artemis's fixed denomination, cap, deposit-only pause guardian, and testnet policy. Keep deployment and public flags fail-closed.

**Tech Stack:** Solidity 0.8.28, Foundry, Circom 2.2.0, snarkjs 0.7.5, `@0xbow/privacy-pools-core-sdk` 1.1.1, viem, Next.js, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-26-shielded-pool-integration-design.md`

## Global Constraints

- Chain support in this work is Robinhood Chain Testnet (46630); do not modify the excluded Solana chain selection.
- All feature switches default to false.
- Never deploy, transfer funds, or enable a public flag as part of implementation.
- Preserve the original rehearsal implementation only in isolated tests/fixtures; it must not appear production-ready.
- Keep code, comments, and docs in English; chat with the user in Indonesian.

---

### Task 1: Pin and verify upstream circuit artifacts

Files: root package lock; `privacy-pool/artifacts/`; `privacy-pool/ARTIFACTS.md`; `scripts/verify-shield-artifacts.mjs`.

- Pin the SDK to 1.1.1 and pin upstream source metadata to tag v1.2.1 commit `a80836a47451e662f127af17e11430ffa976c234`.
- Add the official 0xbow withdrawal and commitment WASM, zkey, and vkey files with published SHA-256 values; reject mismatches in the verification script.
- Export Solidity verifier source from the verified zkeys and compare its verification keys with the artifact vkeys.
- Test: valid circuit examples verify; altered recipient context, root, nullifier, amount, or association membership does not verify.

### Task 2: Replace the custom rehearsal contracts with a compatible capped pool

Files: `contracts/ShieldedPool.sol`; `contracts/ShieldedVerifierMock.sol`; new `contracts/privacy-pool/`; `scripts/compile-shielded.mjs`; `scripts/deploy-shielded.mjs`; contract tests.

- Import the upstream Apache-2.0 native pool/entrypoint/verifier interfaces at the pinned source revision.
- Enforce exactly 0.1 ETH deposits, a 10 ETH cumulative pool cap, zero protocol/relay fees, and recipient/context binding onchain.
- Add an irreversible guardian pause for deposits only and guardian renunciation; withdrawals and ragequit must remain live while deposits are paused.
- Make mainnet deployment impossible in the rehearsal deployer; require explicit testnet confirmation.
- Test: cap/denomination, pause behavior, nullifier replay, stale roots, malicious recipient/fee mutation, reentrancy, and accounting invariants.

### Task 3: Add event indexing and association-set operations

Files: `lib/shielded/`; `app/api/shield/association/route.ts`; `scripts/shield/build-association-set.mjs`; `docs/next/Shielded-Pool-Operations.md`.

- Rebuild the pool state and labels from confirmed onchain events using LeanIMT and Poseidon.
- Create a deterministic public testnet dataset and matching association root; publish an immutable versioned dataset identifier.
- Add reorg-safe block cursor handling and verify the generated root against onchain state before publishing it.
- Test: rebuild from zero, replay a block range, recover from a reorg, reject malformed or incomplete event data, and reproduce an identical root.

### Task 4: Add note recovery and browser proving

Files: `lib/shielded-client.ts`; `components/ShieldPanel.tsx`; `components/ShieldNoteBackup.tsx`; `app/globals.css`; `tests/shield-client.test.ts`.

- Create/recover a user account from a recovery phrase, require an explicit offline backup confirmation before deposit, and never persist plaintext note secrets.
- Encrypt export files with a user password using WebCrypto AES-GCM; validate and restore them without logging secrets.
- Load only hash-verified circuit artifacts, rebuild the account tree from events, produce real withdrawal proofs, and show progress/failure states.
- Gate actual actions on effective server flags and a recognized testnet manifest; do not expose rehearsal proofs as valid.

### Task 5: Add a privacy-preserving withdrawal relayer

Files: `services/shield-relayer/`; `.env.example`; deployment runbook; relayer tests.

- Adapt the pinned upstream relayer API to Robinhood testnet and the single native ETH pool.
- Validate chain, pool, proof, recipient, fee, and rate limits; never accept or log note secrets.
- Bind the fee recipient and rate in the proof context; keep the testnet relayer key server-only.
- Test: valid relay succeeds; altered recipient/fee/context, replay, wrong chain, and over-limit requests fail.

### Task 6: End-to-end local rehearsal and activation controls

Files: deployment scripts/manifests; `docs/next/Implementation-Status.md`; `docs/next/DevBrief-Activation.md`; CI workflow.

- Run local compile, circuit, contract, relay, and browser SDK flows from deposit through recovery and withdrawal.
- Verify the exact B6 scenarios where possible and mark infrastructure/manual-only cases accurately.
- Require explicit production verifier/manifest and explicit testnet rehearsal acknowledgement in deployment policy.
- Keep public Shield flags false until testnet rehearsal and internal review are recorded.

## Current status

Tasks are not complete until their commands produce the stated results. No production activation or deployment is part of this plan.
