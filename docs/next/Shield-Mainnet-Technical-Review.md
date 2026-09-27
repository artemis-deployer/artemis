# Shield Mainnet Technical Review

**Review date:** 2026-09-26  
**Scope:** pinned 0xbow v1.2.1 circuits/verifiers, Artemis SDK integration, and mainnet deployment safeguards.  
**Result:** verifier and circuit artifacts are reproducible and compatible with the exercised testnet flow. This is an internal technical review, not an independent security audit or a claim that the complete application is production-safe.

## Evidence checked

- The vendored core is pinned to `a80836a47451e662f127af17e11430ffa976c234`. The upstream `v1.2.1` GitHub release is signed, and the upstream SDK publishes the artifact checksums used by this repository.
- `npm run verify:shield-artifacts` verifies all six WASM, zkey, and verification-key checksums; exports verification keys and Solidity verifiers from the pinned zkeys; and checks those exports against the vendored verifier contracts.
- `npm run compile:privacy-pools` compiles the pinned core plus the Artemis mainnet pool wrapper with Solidity 0.8.28.
- The single-wallet Robinhood testnet rehearsal used the real Groth16 verifier and completed proof generation, relayed withdrawal, replay rejection, recipient-context rejection, and state reconciliation. The local Foundry invariants use mock verifier collaborators and are not cryptographic evidence.
- The app pins `@0xbow/privacy-pools-core-sdk` 1.5.0. New mnemonic account derivation uses `bytesToBigInt`; the SDK retains a separate legacy derivation path for compatibility with old accounts. Artemis creates and recovers accounts through the mnemonic-based path; the app does not import legacy account records.
- Mainnet chain selection is read-only validated as chain ID 4663. No mainnet contract or transaction is present.

## Mainnet deployment safeguard

The upstream simple pool accepts deposits immediately after construction. The new `ArtemisMainnetPrivacyPoolSimple` variant starts with deposits paused. Its guardian can call `activateDeposits()` once after the deployment and service checks are complete; the existing guardian pause remains irreversible after activation. The mainnet deployment plan records this activation as a separate step, while all application flags remain false.

The initial mainnet association dataset contains only the protocol sentinel. It is valid as an initial root but does not approve user deposits. ASP publication and confirmation of each deposit label are required before that note can be withdrawn privately.

## Residual risks and release boundary

- The upstream audit described a 30-entry circular state-root history; this branch's patched `State.sol` uses 64 entries. Old withdrawal roots can still be evicted after 64 subsequent insertions, so users may need to rebuild proofs against a newer root. The audit also acknowledges that the Poseidon Solidity implementation has not been audited. The association postman can replace the active root without delay.
- The one-wallet setup intentionally concentrates deployer, postman, guardian, and relayer authority. Losing or compromising that wallet affects all of those duties.
- The initial anonymity set is empty. A small set does not provide meaningful practical anonymity; the UI must continue to describe that limitation and must not imply a production privacy guarantee.
- These upstream and operational risks are recorded for the owner. No local test can prove cryptographic soundness or substitute for an independent audit of the Artemis changes.

## Current deployment status

- Mainnet genesis sentinel CID is published and independently fetched from the configured IPFS gateway.
- Mainnet dry-run preflight passes on chain ID 4663 with 0.001 ETH notes and a 10 ETH lifetime cap.
- Mainnet deployment is still not broadcast. The local `.env.local` verifier gate is true only for the internal artifact compatibility review; `SHIELD_MAINNET_BROADCAST_ENABLED=false`, the mainnet manifest is absent, and all Shield feature flags remain false.
- The deployment runner recompiles with Solidity 0.8.28 and checks pinned hashes for every deployed verifier, implementation, proxy, pool, and Poseidon library artifact. After broadcast it verifies the paused state, guardian, verifier and Entrypoint addresses, denomination, cap, native-asset registration, zero fees, scope registration, ASP root/CID, and final roles before writing the manifest.

References: [upstream v1.2.1 release](https://github.com/0xbow-io/privacy-pools-core/releases/tag/v1.2.1), [upstream SDK](https://www.npmjs.com/package/@0xbow/privacy-pools-core-sdk), [L2BEAT Privacy Pools profile and reproducibility notes](https://l2beat.com/privacy/projects/privacy-pools), and [Auditware's upstream contract audit](https://github.com/Auditware/audits/blob/main/0xbow/Privacy%20Pools%20Core/Privacy%20Pools%20Core%20Audit%20Report.md).
