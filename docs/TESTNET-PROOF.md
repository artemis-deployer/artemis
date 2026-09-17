# Kentir Testnet Proof (Hood Testnet, chain 46630)

Deployed with the repo template (`contracts/KentirToken.sol` via `scripts/compile-token.mjs`) from a drill wallet. No mainnet funds involved.

- Token: `0x20ae6f49a369af85f6c4b9f5ed2f588eac5d9838`
- Name: Kentir Rehearsal / Symbol: KTST / Supply: 1000000000 * 1e18 (read back onchain)
- Deploy tx: `0xed9966841ed34e5c65d8ca003d7c82962546e10e446720c3eb2e2d2477e37626`
- Block: 120874897
- Explorer: https://explorer.testnet.chain.robinhood.com

Pool step intentionally skipped: no Uniswap V2 deployment exists on this testnet (verified: mainnet router/factory and canonical V2 addresses hold no code at 46630). The app surfaces this as the `stub` rehearsal state.
