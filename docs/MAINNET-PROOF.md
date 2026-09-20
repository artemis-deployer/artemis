# Artemis Mainnet Proof (Hood Chain, chain 4663)

First atomic 1-transaction launch via `contracts/ArtemisLauncher.sol`
(deployed at `0xeea9d0f7ee0958c6d59f25162be4e69ba60a0f71`, source verified
exact match on Blockscout, MIT, solc 0.8.26, optimizer 200 runs).

- Token: `0x1b497f3577df58f5a15f062d3f8a22999b4e86cc`
- Name: Asif Alchemy / Symbol: ASIF / Supply: 999000000 * 1e18 fixed, no mint
- Pool: 1000 ASIF + 0.0002 ETH into Uniswap V2, one transaction
- Launch tx: `0x3bebcd4dd28b55c3fa5d56a2b1dde41ff91adf8ac6a996c8534e835e68585ab0`
- Pair: `0xc682AeFee57c0fbe890238f6f09d0066d450f834`
- Gas used: 3179544 (estimate was 3278258)
- DexScreener: https://dexscreener.com/robinhood/0xc682AeFee57c0fbe890238f6F09d0066d450f834
- Showcase: verified onchain (`invalid_tx` rejects fakes), listed at `/tokens`
