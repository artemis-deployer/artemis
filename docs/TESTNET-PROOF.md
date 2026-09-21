# Proof of Testnet

Artemis Rehearsal (ARTS, 1B fixed, 18 decimals, test instrument):
0x3c36c1e53bb363714533e36fa9c47122bd90589d
Explorer:
https://explorer.testnet.chain.robinhood.com/address/0x3c36c1e53bb363714533e36fa9c47122bd90589d

Deploy Tx (token only, pool step stubbed — no Uniswap V2 on testnet):
0x1bf4e9fd92c29e931c8a832c22ac2b43dd15ed3f1251b0ee2f0dcb756b459181
Block: 122244206
https://explorer.testnet.chain.robinhood.com/tx/0x1bf4e9fd92c29e931c8a832c22ac2b43dd15ed3f1251b0ee2f0dcb756b459181

Deployed with the repo template (`contracts/ArtemisToken.sol` via `scripts/compile-token.mjs`) from a drill wallet. Name, symbol, and supply read back onchain.

Re-verified live 2026-09-21 (eth_call, block 122247518): name "Artemis Rehearsal", symbol "ARTS", totalSupply 1000000000000000000000000000 (1B).

Hood Testnet 46630. Test instruments, zero real funds.
