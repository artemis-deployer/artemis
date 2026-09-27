import { parseAbi } from "viem";

export const SHIELDED_POOL_READ_ABI = parseAbi([
  "event Deposited(address indexed _depositor, uint256 _commitment, uint256 _label, uint256 _value, uint256 _precommitmentHash)",
  "event Withdrawn(address indexed _processooor, uint256 _value, uint256 _spentNullifier, uint256 _newCommitment)",
  "event Ragequit(address indexed _ragequitter, uint256 _commitment, uint256 _label, uint256 _value)",
  "function SCOPE() view returns (uint256)",
  "function currentTreeSize() view returns (uint256)",
  "function currentRootIndex() view returns (uint32)",
  "function roots(uint256) view returns (uint256)",
  "function nullifierHashes(uint256) view returns (bool)",
]);

export const SHIELDED_ENTRYPOINT_ABI = parseAbi([
  "function deposit(uint256 _precommitment) payable returns (uint256 _commitment)",
  "function latestRoot() view returns (uint256)",
]);
