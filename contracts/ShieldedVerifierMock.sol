// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice TESTNET-ONLY mock verifier. Accepts any non-empty proof whose first
/// byte is non-zero so the pool lifecycle can be exercised end to end on
/// Robinhood Testnet (46630). NEVER use on mainnet: it proves nothing.
/// Mainnet requires the audited Groth16/PLONK verifier + ceremony transcript.
contract ShieldedVerifierMock {
  function verify(
    bytes calldata proof,
    bytes32,
    bytes32,
    address,
    uint256,
    bytes32
  ) external pure returns (bool) {
    return proof.length > 0 && proof[0] != 0x00;
  }
}
