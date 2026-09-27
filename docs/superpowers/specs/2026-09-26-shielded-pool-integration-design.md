# Shielded Pool Integration Design

## Goal

Replace Artemis's mock-backed rehearsal pool with a testnet-ready native ETH privacy pool whose contracts, Groth16 circuits, browser SDK, association-set data, and relayer use one pinned protocol format.

## Decisions

- Pin the upstream 0xbow Privacy Pools Core source to v1.2.1 (`a80836a47451e662f127af17e11430ffa976c234`) and retain its Apache-2.0 notices.
- Use its Circom 2.2 / Groth16 withdrawal and commitment circuits, Poseidon commitments, LeanIMT state/association trees, and SDK. Do not use Artemis's rehearsal Keccak tree or mock verifier in the integrated pool.
- Support native ETH on Robinhood Chain Testnet (46630) first. Keep mainnet deployment blocked and all feature flags off by default.
- Keep the brief's planned denomination at 0.1 ETH; enforce deposit and withdrawal amounts onchain and cap total deposits onchain. Use zero protocol and relay fees in the initial rehearsal.
- Use an immutable deployment with one declared ASP postman for testnet. The published testnet policy accepts all valid deposits and makes no compliance claim. Mainnet policy remains an owner/legal decision.
- Add a guardian that can irreversibly pause deposits only; withdrawal and ragequit remain callable. Allow guardian renunciation.
- Treat recovery as essential: derive secrets from a user-held recovery phrase, require confirmation before deposit, never store plaintext secrets in browser storage, and support encrypted export plus full event rescan.
- Treat deployment and public activation as separate operator actions. Code completion does not turn on flags or broadcast transactions.

## Architecture

The contract layer uses the upstream commitment and withdrawal public-signal layout and verifier, with Artemis patches limited to exact-denomination enforcement, cumulative pool caps, native-ETH-only configuration, and a deposit-only guardian pause. The pool's context hash binds the withdrawal recipient and fee data; withdrawals are relayed so the recipient wallet does not need gas.

The browser uses the pinned 0xbow SDK with locally served, hash-pinned artifacts. It creates and recovers accounts, indexes deposit/withdrawal/ragequit events, builds the LeanIMT trees, constructs proofs, encrypts note backups, and submits deposits or relay requests. A separate relay service receives proofs, validates the fixed pool configuration, and submits withdrawal transactions without receiving note secrets.

The association-set operator rebuilds a public LeanIMT from accepted deposit labels, publishes a versioned dataset, and posts the exact root and URI to the immutable entrypoint. The initial testnet policy accepts every confirmed testnet deposit. Every update is public and cannot change a withdrawal recipient or fee because those values are bound into the proof context.

## Security boundaries

- Arbitrary proof acceptance is forbidden in integrated contracts and deploy scripts.
- Production proving artifacts must match the pinned circuit source and published ceremony hashes; generated local setup keys are never trusted.
- Testnet rehearsal is required before any public testnet flag is enabled.
- Mainnet remains out of scope until B6 scenarios pass, the internal review has no open critical/high findings, the policy/legal work in B8 is complete, and the owner explicitly approves activation.

## Verification

Verify artifact checksums, regenerate verifier source from the pinned final zkey, compile contracts with the pinned compiler, test circuit valid/invalid witnesses, test contract state transitions and proof binding, run a local-chain deposit-to-relayed-withdraw rehearsal, and run the app's typecheck, lint, unit tests, and production build.
