# Shield Mainnet End-to-End Preparation Plan

> **For agentic workers:** Use `superpowers:executing-plans` inline, one task at a time. Preserve all current uncommitted feature work.

**Goal:** Prepare the existing Shielded Pool stack for Robinhood mainnet chain 4663 without sending a mainnet transaction or enabling any public flags.

**Architecture:** Add a shared server-side network descriptor and use the runtime-validated manifest for every Shield RPC path. Add a fail-closed mainnet deployment dry-run, local EVM contract tests against pinned pool bytecode, and read-only mainnet checks while keeping testnet configuration and behavior intact.

**Tech Stack:** Next.js 16, TypeScript, viem, Vitest, Solidity 0.8.28, pinned 0xbow Privacy Pools Core v1.2.1, published Groth16 artifacts, Robinhood Chain RPC.

**Spec:** `docs/superpowers/specs/2026-09-26-shield-mainnet-support-design.md`.

## Global Constraints

- Mainnet chain ID is `4663`; testnet chain ID is `46630`.
- Initial pool denomination is `0.001 ETH`; cumulative lifetime cap is `10 ETH`.
- One operator wallet can hold deployer, ASP postman, guardian, and relayer duties.
- All Shield flags stay false and no mainnet transaction is sent.
- Contract/compiler/artifact versions stay pinned to Solidity `0.8.28` and core `v1.2.1`.
- Mobile, second-device, and legal checks are waived and out of scope.

---

### Task 1: Add network descriptors and runtime policy tests

**Files:**
- Create: `lib/shield-networks.ts`
- Modify: `lib/shield-runtime.ts`
- Modify: `tests/shield-runtime.test.ts`

- [ ] Add failing tests for mainnet/testnet descriptors, unknown chain rejection, and manifest chain/status mismatch.
- [ ] Run `npx vitest run tests/shield-runtime.test.ts`; confirm the new cases fail for missing mainnet selection.
- [ ] Implement typed chain descriptors for 4663 and 46630 and manifest status validation.
- [ ] Run the focused test and confirm both networks pass while unknown and mismatched configuration fails closed.

### Task 2: Make Shield API RPC use runtime-selected chain

**Files:**
- Modify: `app/api/shield/relay/route.ts`
- Modify: `app/api/shield/association/route.ts`
- Modify: `lib/shielded-client.ts` only if API-provided pool config currently loses chain ID
- Modify: `tests/shield-live-testnet-rehearsal.test.ts` or focused route tests

- [ ] Add failing assertions that RPC clients are built with runtime `chainId`, and that a selected mainnet config never issues a chain-46630 call.
- [ ] Run focused route tests and confirm the hard-coded chain ID is detected.
- [ ] Replace hard-coded chain IDs and RPC defaults with validated runtime values; reject a mismatch before signing.
- [ ] Run focused relay/association tests and the existing testnet E2E harness tests.

### Task 3: Generalize association publishing and read-only operations

**Files:**
- Modify: `scripts/shield/publish-association-set.mjs`
- Modify: `scripts/shield/publish-genesis-association.mjs`
- Create: `scripts/shield/check-mainnet-readonly.mjs`
- Modify: `package.json`
- Modify: `tests/shield-deployment-policy.test.ts`

- [ ] Add policy tests for mainnet manifest/RPC mismatch and testnet manifest rejection on chain 4663.
- [ ] Run the focused policy tests and confirm rejection cases fail until network selection is explicit.
- [ ] Use manifest-derived chain/RPC for association publishing while keeping the existing testnet commands and guards unchanged.
- [ ] Add `shield:check-mainnet-readonly` to verify only chain ID, RPC availability, and absence/presence of manifest code using `eth_call`/read RPC methods; never request a signer.
- [ ] Test with mocked RPC responses for correct ID, wrong ID, unavailable RPC, missing manifest, and mismatched addresses.

### Task 4: Add mainnet deployment dry-run tooling

**Files:**
- Create: `scripts/deploy-privacy-pools-mainnet.mjs`
- Create: `scripts/shield-mainnet-deployment-policy.mjs`
- Create: `tests/shield-mainnet-deployment-policy.test.ts`
- Modify: `package.json`
- Modify: `.env.example`

- [ ] Write tests proving default invocation is dry-run, wrong chain is rejected, explicit broadcast needs both an argv acknowledgement and an env opt-in, and testnet scripts remain testnet-only.
- [ ] Run focused tests and verify all unsafe combinations fail before wallet-client creation.
- [ ] Implement deployment plan generation from pinned artifacts, chain 4663 descriptor, single operator account, denomination/cap, and role graph.
- [ ] Assert the dry-run contains addresses it intends to deploy, selected implementation/verifiers, fee parameters, and role/renunciation steps, without transaction hashes or private key output.
- [ ] Add an environment template with blank mainnet RPC/key fields and false readiness flags; do not copy secrets from `.env.local`.
- [ ] Run dry-run tests against mock public/wallet clients; never invoke broadcast mode.

### Task 5: Execute actual pool bytecode in a local EVM invariant suite

**Files:**
- Create: `tests/evm/ShieldPoolInvariant.t.sol` or `tests/shield-pool-evm.test.ts` (choose the harness that is available and reproducible on Windows)
- Create: test-only mocks under `tests/evm/`
- Modify: `package.json` only for pinned test tooling/scripts
- Modify: `docs/next/DevBrief-Activation.md`

- [ ] Choose the installed local EVM runner by checking `forge`, `anvil`, and project dependencies; avoid adding a second Solidity framework if an installed one can run deployed bytecode.
- [ ] Add one failing invariant that deploys the actual `PrivacyPoolSimple` artifact and expects `lifetimeDeposited - withdrawn == address(pool).balance` after a valid deposit/withdraw cycle.
- [ ] Run the focused test and confirm it fails because there is no executable contract harness.
- [ ] Deploy the pinned test artifact and test-only collaborator contracts to an ephemeral local chain.
- [ ] Cover wrong denomination, over-cap deposit, unauthorized guardian, paused deposit, withdrawal while paused, replay, invalid proof, and recipient/context substitution.
- [ ] Run a deterministic randomized sequence against contract state; assert reverting calls preserve balance, nonce/nullifier state, and deposit totals.
- [ ] Label local contract EVM fuzz separately from testnet E2E and model-only randomized tests.

### Task 6: End-to-end configuration and mainnet-safe documentation

**Files:**
- Modify: `docs/next/DevBrief-Activation.md`
- Modify: `docs/next/Implementation-Status.md`
- Modify: `docs/next/Shielded-Pool-Operations.md`
- Modify: `.env.example`
- Modify: `tests/feature-flags.test.ts`

- [ ] Add failing tests that public feature flags remain false for chain 4663 even when only `SHIELD_CHAIN_ID` is changed.
- [ ] Run the focused feature-flag test and verify mainnet cannot become enabled by chain selection alone.
- [ ] Keep production and readiness flags false in examples and runtime defaults.
- [ ] Document the mainnet dry-run command, required env variable names, expected mainnet manifest schema, read-only checks, and separate broadcast boundary.
- [ ] Record mobile, second-device, and legal checks as owner-waived; record actual unresolved test evidence without calling it passed.

### Task 7: Final verification

**Files:**
- Review: all modified files and active deployment manifest

- [ ] Run `npm ci` after stopping any workspace dev server that holds native package files; restart the server after validation.
- [ ] Run `npm test`, `npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm run compile:privacy-pools`, `npm run verify:shield-artifacts`, and `npm audit`.
- [ ] Run testnet reconciliation and cap/pause state-override checks; confirm each reports no transaction broadcast.
- [ ] Run mainnet RPC read-only checker and deployment dry-run; confirm chain 4663 and no signing/broadcast.
- [ ] Verify all Shield API flags are false and the restarted dev server responds on its original port.
- [ ] Run `git diff --check`, validate all manifests as JSON, and record any non-mainnet external prerequisites accurately.
