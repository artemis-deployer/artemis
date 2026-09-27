# Shielded Pool Mainnet Support

## Status

Owner approved this design on 2026-09-26. It prepares the Shielded Pool implementation for Robinhood Chain mainnet while leaving all activation flags false and sending no mainnet transaction.

## Goal

Extend the existing, tested Robinhood testnet Shield integration to support a separately deployed Robinhood mainnet pool, with chain-aware runtime, relayer, association-set publishing, deployment tooling, and repeatable local contract tests.

## Owner decisions

- Target chain: Robinhood Chain mainnet, chain ID `4663`.
- Testnet chain `46630` remains supported and remains the default environment.
- One operator wallet may deploy, publish association roots, act as guardian, and relay withdrawals.
- Initial pool configuration: fixed `0.001 ETH` denomination and `10 ETH` lifetime deposit cap, matching the accepted rehearsal bytecode.
- Mobile, second-device, and legal-review checks are out of scope.
- All public Shield flags remain false. This work does not deploy or broadcast on mainnet.

## Design

### Network selection and runtime validation

Add one server-only network descriptor for each supported Robinhood chain. Resolve chain ID, default RPC, expected deployment status, and explorer from that descriptor. The selected manifest must match the selected chain, status, denomination, cap, verifier addresses, and pool/Entrypoint addresses. The RPC chain ID and deployed onchain configuration must match before the runtime can report a deployment as configured. Activation still requires the existing readiness flags and valid relayer configuration.

Mainnet must use its own manifest and newly deployed contracts. No testnet address may be accepted by a mainnet runtime. Mainnet RPC defaults to Robinhood's published endpoint `https://rpc.mainnet.chain.robinhood.com`; operators may configure a private endpoint through environment variables.

### App, indexer, association service, and relayer

All Shield server paths use the validated runtime's `chainId`, RPC URL, pool, EntryPoint, scope, and manifest. No route may silently fall back to chain `46630` after a mainnet manifest is selected. Event recovery and association-set publication remain pinned to confirmed blocks and the deployed pool. Relayed proofs retain recipient/context binding, latest-root checks, nullifier replay protection, fee limits, and shared database-backed rate limits on either chain.

### Deployment tooling

Keep the existing testnet deployment command intact. Add a separate mainnet deployment command that defaults to dry-run, checks RPC chain ID `4663`, checks the signer against the configured operator address, compiles only the pinned Solidity/compiler/artifacts, and emits a reviewable deployment plan without signing or broadcasting. Broadcasting requires an explicit command-line acknowledgement and an environment opt-in; neither is used in this work. The resulting manifest is marked mainnet and records all deployed addresses and transaction hashes.

The operator wallet receives only the roles needed for deployment and operations. Entrypoint owner authority is renounced after pool registration/configuration; the configured guardian can stop deposits but cannot move pool funds. Deployment validation must fail closed if any role or immutable address differs from the manifest.

### Contract and integration testing

Add a local EVM harness that deploys the actual pinned pool bytecode with test-only Entrypoint/verifier collaborators. Exercise exact denomination, lifetime cap, pause-only-deposits, valid withdrawal behavior, replay rejection, recipient binding, and balance accounting against EVM state. Deterministic randomized sequences exercise valid and reverting calls; model-only results remain labeled separately. No mock verifier or harness address is deployable by production scripts.

The existing real testnet rehearsal remains the end-to-end network check. Mainnet validation before deployment consists only of read-only RPC identity/availability checks and deployment dry-run. No mainnet contract can be claimed verified or operational until a real mainnet deployment is separately authorized and recorded.

## Security and operational requirements

- `SHIELD_ENABLED`, deposit, withdrawal, and all readiness flags remain false by default and in the checked-in examples.
- Do not log or print private keys, recovery phrases, or proof secrets.
- Never use the testnet manifest or deployment addresses on mainnet.
- No mainnet deployment or transaction is included in this implementation.
- Keep recovery-note handling client-side and preserve the warning/backup acknowledgement flow.
- Association-set content and roots must be immutable/content-addressed and tied to the chain snapshot that produced them.

## Acceptance criteria

1. Testnet behavior remains unchanged and its full existing suite and rehearsal checks pass.
2. Runtime and all Shield routes select chain from the validated manifest and reject chain/manifest/RPC mismatches.
3. A mainnet dry-run produces a complete deployment plan and never broadcasts; accidental testnet/mainnet cross-selection is rejected.
4. The local EVM suite executes actual pool bytecode and checks contract invariants over deterministic randomized operations.
5. `npm audit`, TypeScript, lint, production build, artifact integrity, and the full Vitest suite pass.
6. API and environment checks confirm all activation flags remain false.
7. Documentation clearly says that source/tooling readiness is not a live mainnet deployment or an operational mainnet pool.

## External boundary

This work can make the software, tests, and deployment preparation mainnet-capable. It cannot produce a live mainnet deployment without a separate explicit broadcast request, mainnet-funded wallet, and a mainnet deployment manifest with confirmed transaction data.
