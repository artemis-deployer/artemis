# Proof of Mainnet

ArtemisLauncher Implementation (source verified, exact match, MIT):
0xeea9d0f7ee0958c6d59f25162be4e69ba60a0f71
Blockscout:
https://robinhoodchain.blockscout.com/address/0xeea9d0f7ee0958c6d59f25162be4e69ba60a0f71
Deploy Tx:
0x4fa871c14627052b968198e3598a1e27832e5aaa17d1997a093c5d47a8cbf235
https://robinhoodchain.blockscout.com/tx/0x4fa871c14627052b968198e3598a1e27832e5aaa17d1997a093c5d47a8cbf235
Deployer: 0x272568D25b9634Ad8A4e8E8CBB10b729f41C781d
Compiler: solc 0.8.26, optimizer enabled, 200 runs, MIT
Constructor: router 0x89e5db8b5aa49aa85ac63f691524311aeb649eba (Uniswap V2)
Reads: router() returns the V2 router above
Writes: launch(name, symbol, supply, pooled, ethMin, deadline) payable — deploys token + funds pool atomically, LP + leftover to creator
Events: Launched(token, creator, pooledTokens, ethAdded, liquidity)

Asif Alchemy (ASIF, 999M fixed, no mint, 18 decimals):
0x1b497f3577df58f5a15f062d3f8a22999b4e86cc
Blockscout:
https://robinhoodchain.blockscout.com/token/0x1b497f3577df58f5a15f062d3f8a22999b4e86cc

Atomic Launch Transaction (token + pool, 1 tx):
0x3bebcd4dd28b55c3fa5d56a2b1dde41ff91adf8ac6a996c8534e835e68585ab0
Block: 67920183
Gas used: 3178008
https://robinhoodchain.blockscout.com/tx/0x3bebcd4dd28b55c3fa5d56a2b1dde41ff91adf8ac6a996c8534e835e68585ab0

Uniswap V2 Pool ASIF/WETH (launch: 1000 ASIF + 0.0002 ETH):
0xc682aefee57c0fbe890238f6f09d0066d450f834
DexScreener:
https://dexscreener.com/robinhood/0xc682aefee57c0fbe890238f6f09d0066d450f834

Re-verified live 2026-09-21 (eth_call, block 68497721): router() 0x89e5db8b5aa49aa85ac63f691524311aeb649eba; token name "Asif Alchemy", symbol "ASIF", totalSupply 999000000000000000000000000 (999M), decimals 18; pair token0 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 (WETH), token1 0x1b497f3577df58f5a15f062d3f8a22999b4e86cc (ASIF), LP totalSupply 447213595499957939; reserves 201998778000000 wei ETH / 990134391686851893666 wei ASIF (~0.0002019 ETH / ~990.13 ASIF); router factory 0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f, WETH 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73; launch tx to launcher, status success, gasUsed 3178008; DexScreener indexed (uniswap v2, priceNative 0.0000002040, liquidity base 990.1343 / quote 0.0002019).

Showcase entry (verified onchain, fake txs rejected):
https://artemis-olive.vercel.app/tokens

Hood Chain Mainnet 4663. Live token, verified on-chain.
